import { Webhook } from 'svix';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger, maskEmail, webhookLogger } from '@/lib/logger';


export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    logger.error('[Webhook Clerk] CLERK_WEBHOOK_SECRET não configurado');
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  // Pegar headers diretamente do Request (mais confiável que next/headers)
  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    logger.error('[Webhook Clerk] Headers Svix ausentes');
    return new NextResponse('Headers ausentes', { status: 400 });
  }

  // 🔑 CRÍTICO: Usar req.text() para obter o body RAW original
  // req.json() + JSON.stringify() pode alterar a ordem das keys/espaçamento,
  // quebrando a verificação de assinatura Svix
  const body = await req.text();

  // Verificar webhook com o body EXATO recebido
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    logger.error('[Webhook Clerk] Verificação de assinatura falhou', err);
    return new NextResponse('Assinatura inválida', { status: 400 });
  }

  // Extrair dados do evento
  const { type, data } = evt;
  const eventId = svix_id; // Usar svix_id como identificador único do evento

  webhookLogger.received(type, eventId);

  // ============================================================================
  // 🔒 IDEMPOTÊNCIA: Verificar se evento já foi processado
  // ============================================================================
  try {
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('source', 'clerk')
      .single();

    if (existingEvent) {
      webhookLogger.duplicate(type, eventId);
      return new NextResponse('OK - Already processed', { status: 200 });
    }
  } catch (error) {
    // Erro ao verificar = continuar (fail-open para não bloquear webhooks legítimos)
    logger.warn('[Webhook Clerk] Erro ao verificar idempotência', { error });
  }

  // ============================================================================
  // 📝 REGISTRAR EVENTO: Marcar como "processing"
  // ============================================================================
  try {
    await supabaseAdmin.from('webhook_events').insert({
      event_id: eventId,
      event_type: type,
      source: 'clerk',
      status: 'processing',
      received_at: new Date().toISOString(),
      payload: evt,
    });
  } catch (error: any) {
    // Se erro for de duplicação (23505 = unique constraint), evento já sendo processado
    if (error.code === '23505') {
      logger.info('[Webhook Clerk] Evento já em processamento', { eventId });
      return new NextResponse('OK - Already processing', { status: 200 });
    }
    logger.error('[Webhook Clerk] Erro ao registrar evento', error);
    // Continuar processamento mesmo se falhar registro
  }

  // ============================================================================
  // 🎯 PROCESSAR EVENTO
  // ============================================================================
  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data, req, eventId);
        break;

      case 'user.updated':
        await handleUserUpdated(data, eventId);
        break;

      case 'user.deleted':
        await handleUserDeleted(data, eventId);
        break;

      case 'session.created':
      case 'session.ended':
      case 'session.removed':
        logger.debug('[Webhook Clerk] Sessão ignorada', { type });
        await markEventAsCompleted(eventId, 'Evento de sessão ignorado');
        return new NextResponse('OK', { status: 200 });

      default:
        logger.warn('[Webhook Clerk] Evento não tratado', { type });
        await markEventAsCompleted(eventId, 'Tipo de evento não implementado');
        return new NextResponse('OK', { status: 200 });
    }

    // Marcar como completado
    await markEventAsCompleted(eventId);
    webhookLogger.processed(type, eventId);

    return new NextResponse('OK', { status: 200 });

  } catch (error: any) {
    webhookLogger.failed(type, eventId, error);

    // Marcar como failed
    await markEventAsFailed(eventId, error.message);

    // Retornar 500 para que Clerk tente novamente
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// ============================================================================
// 🛠️ FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Marca evento como completado
 */
async function markEventAsCompleted(eventId: string, message?: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        error_message: message || null,
      })
      .eq('event_id', eventId);
  } catch (error) {
    logger.warn('[Webhook Clerk] Erro ao marcar evento como completado', { error });
  }
}

/**
 * Marca evento como falhado
 */
async function markEventAsFailed(eventId: string, errorMessage: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('event_id', eventId);
  } catch (error) {
    logger.warn('[Webhook Clerk] Erro ao marcar evento como falhado', { error });
  }
}

/**
 * Valida e normaliza dados do Clerk
 */
function validateAndNormalizeClerkData(data: any): { email: string; name: string } | null {
  // Validar email
  const email = data.email_addresses?.[0]?.email_address;
  if (!email || typeof email !== 'string') {
    logger.error('[Webhook Clerk] Email ausente ou inválido no payload');
    return null;
  }

  // Normalizar email (lowercase + trim)
  const normalizedEmail = email.toLowerCase().trim();

  // Montar nome
  const firstName = data.first_name || '';
  const lastName = data.last_name || '';
  const name = `${firstName} ${lastName}`.trim() || 'Usuário';

  return { email: normalizedEmail, name };
}

// ============================================================================
// 📝 HANDLERS DE EVENTOS
// ============================================================================

/**
 * Handler: Usuário criado
 */
async function handleUserCreated(data: any, req: Request, eventId: string): Promise<void> {
  // Validar dados
  const validated = validateAndNormalizeClerkData(data);
  if (!validated) {
    throw new Error('Dados do Clerk inválidos: email ausente');
  }

  const { email, name } = validated;
  logger.info('[Webhook Clerk] user.created', { email: maskEmail(email), clerk_id: data.id });



  // PROTEÇÃO CONTRA DUPLICAÇÃO:
  // Verificar se usuário já existe (por clerk_id OU email)
  const { data: existingUsers } = await supabaseAdmin
    .from('users')
    .select('id, clerk_id, email, created_at')
    .or(`clerk_id.eq.${data.id},email.ilike.${email}`);

  // Se encontrou múltiplos usuários com mesmo email = PROBLEMA!
  if (existingUsers && existingUsers.length > 1) {
    logger.warn('[Webhook Clerk] Múltiplos usuários encontrados', { clerk_id: data.id, count: existingUsers.length });
    // Usar o mais antigo como base
    existingUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const existing = existingUsers?.[0];

  if (existing) {
    logger.info('[Webhook Clerk] Usuário já existe, atualizando', { email: maskEmail(existing.email) });

    // Atualizar dados do usuário existente
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        clerk_id: data.id, // Atualizar clerk_id caso email já existia
        email: email,
        name: name,
        picture: data.image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Erro ao atualizar usuário existente: ${updateError.message}`);
    }

    logger.success('[Webhook Clerk] Usuário atualizado', { email: maskEmail(email) });
    return;
  }

  // Inserir apenas se NÃO existir
  logger.info('[Webhook Clerk] Criando novo usuário', { email: maskEmail(email) });

  const { error, data: newUser } = await supabaseAdmin
    .from('users')
    .insert({
      clerk_id: data.id,
      email: email,
      name: name,
      picture: data.image_url || null,
      subscription_status: 'inactive',
      is_paid: false,
      tools_unlocked: false,
      plan: 'free',
      credits: 0,
      usage_this_month: {},
      daily_usage: {},
    })
    .select()
    .single();

  if (error) {
    // Verificar se é erro de duplicação (UNIQUE constraint)
    if (error.code === '23505') {
      logger.warn('[Webhook Clerk] Constraint violation, tentando atualizar');

      // Tentar buscar e atualizar o usuário existente
      const { data: duplicateUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (duplicateUser) {
        await supabaseAdmin
          .from('users')
          .update({
            clerk_id: data.id,
            name: name,
            picture: data.image_url || null,
          })
          .eq('id', duplicateUser.id);

        logger.success('[Webhook Clerk] Usuário duplicado atualizado', { email: maskEmail(email) });
        return;
      }

      throw new Error(`Duplicação não resolvida para: ${email}`);
    }

    throw new Error(`Erro ao criar usuário: ${error.message}`);
  }

  logger.success('[Webhook Clerk] Novo usuário criado', { email: maskEmail(email), userId: newUser?.id });
}

/**
 * Handler: Usuário atualizado
 */
async function handleUserUpdated(data: any, eventId: string): Promise<void> {
  // Validar dados
  const validated = validateAndNormalizeClerkData(data);
  if (!validated) {
    throw new Error('Dados do Clerk inválidos: email ausente');
  }

  const { email, name } = validated;
  logger.info('[Webhook Clerk] user.updated', { email: maskEmail(email), clerk_id: data.id });

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      email: email,
      name: name,
      picture: data.image_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', data.id);

  if (error) {
    throw new Error(`Erro ao atualizar usuário: ${error.message}`);
  }

  logger.success('[Webhook Clerk] Usuário atualizado', { email: maskEmail(email) });
}

/**
 * Handler: Usuário deletado
 */
async function handleUserDeleted(data: any, eventId: string): Promise<void> {
  logger.info('[Webhook Clerk] user.deleted', { clerk_id: data.id });

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('clerk_id', data.id);

  if (error) {
    throw new Error(`Erro ao deletar usuário: ${error.message}`);
  }

  logger.success('[Webhook Clerk] Usuário deletado', { clerk_id: data.id });
}

// ⚠️ NÃO usar Edge Runtime para webhooks!
// Edge não suporta crypto completo do svix e pode quebrar supabaseAdmin
// O runtime padrão (Node.js) é obrigatório aqui.
