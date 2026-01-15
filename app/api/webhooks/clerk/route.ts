import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkSignupAbuse, getClientIP } from '@/lib/abuse-prevention';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('[Webhook Clerk] ❌ CLERK_WEBHOOK_SECRET não configurado');
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  // Pegar headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('[Webhook Clerk] ❌ Headers Svix ausentes');
    return new NextResponse('Headers ausentes', { status: 400 });
  }

  // Pegar body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verificar webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('[Webhook Clerk] ❌ Erro ao verificar assinatura:', err);
    return new NextResponse('Assinatura inválida', { status: 400 });
  }

  // Extrair dados do evento
  const { type, data } = evt;
  const eventId = svix_id; // Usar svix_id como identificador único do evento

  console.log(`[Webhook Clerk] 📨 Evento recebido: ${type} (ID: ${eventId})`);

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
      console.log(`[Webhook Clerk] ⏭️ Evento já processado: ${eventId} (status: ${existingEvent.status})`);
      return new NextResponse('OK - Already processed', { status: 200 });
    }
  } catch (error) {
    // Erro ao verificar = continuar (fail-open para não bloquear webhooks legítimos)
    console.warn('[Webhook Clerk] ⚠️ Erro ao verificar idempotência:', error);
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
      console.log(`[Webhook Clerk] ⏭️ Evento já em processamento: ${eventId}`);
      return new NextResponse('OK - Already processing', { status: 200 });
    }
    console.error('[Webhook Clerk] ❌ Erro ao registrar evento:', error);
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
        console.log(`[Webhook Clerk] ℹ️ Sessão ignorada: ${type}`);
        await markEventAsCompleted(eventId, 'Evento de sessão ignorado');
        return new NextResponse('OK', { status: 200 });

      default:
        console.log(`[Webhook Clerk] ⚠️ Evento não tratado: ${type}`);
        await markEventAsCompleted(eventId, 'Tipo de evento não implementado');
        return new NextResponse('OK', { status: 200 });
    }

    // Marcar como completado
    await markEventAsCompleted(eventId);
    console.log(`[Webhook Clerk] ✅ Evento processado com sucesso: ${type} (${eventId})`);

    return new NextResponse('OK', { status: 200 });

  } catch (error: any) {
    console.error(`[Webhook Clerk] ❌ Erro ao processar evento ${type}:`, error);

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
    console.error('[Webhook Clerk] ⚠️ Erro ao marcar evento como completado:', error);
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
    console.error('[Webhook Clerk] ⚠️ Erro ao marcar evento como falhado:', error);
  }
}

/**
 * Valida e normaliza dados do Clerk
 */
function validateAndNormalizeClerkData(data: any): { email: string; name: string } | null {
  // Validar email
  const email = data.email_addresses?.[0]?.email_address;
  if (!email || typeof email !== 'string') {
    console.error('[Webhook Clerk] ❌ Email ausente ou inválido no payload:', data);
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
  console.log(`[Webhook Clerk] 👤 user.created: ${email} (clerk_id: ${data.id})`);

  // 🛡️ ANTI-ABUSO: Verificar se IP está criando múltiplas contas
  const ipAddress = await getClientIP(req);
  const abuseCheck = await checkSignupAbuse(ipAddress, email, data.id);

  if (abuseCheck.shouldBlock) {
    console.warn(`[Webhook Clerk] 🚫 Signup bloqueado por abuso: ${email} (${ipAddress}) - ${abuseCheck.reason}`);
    // Conta já foi deletada pelo checkSignupAbuse
    return;
  }

  if (abuseCheck.accountsCount > 1) {
    console.log(`[Webhook Clerk] ⚠️ Signup suspeito: ${email} (${ipAddress}) - ${abuseCheck.accountsCount} contas deste IP`);
  }

  // PROTEÇÃO CONTRA DUPLICAÇÃO:
  // Verificar se usuário já existe (por clerk_id OU email)
  const { data: existingUsers } = await supabaseAdmin
    .from('users')
    .select('id, clerk_id, email, created_at')
    .or(`clerk_id.eq.${data.id},email.ilike.${email}`);

  // Se encontrou múltiplos usuários com mesmo email = PROBLEMA!
  if (existingUsers && existingUsers.length > 1) {
    console.error('[Webhook Clerk] ⚠️ ALERTA: Múltiplos usuários com mesmo email:', {
      email: email,
      count: existingUsers.length,
      users: existingUsers.map(u => ({ id: u.id, clerk_id: u.clerk_id, email: u.email }))
    });
    // Usar o mais antigo como base
    existingUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const existing = existingUsers?.[0];

  if (existing) {
    console.log(`[Webhook Clerk] 🔄 Usuário já existe (${existing.email}), atualizando dados...`);

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

    console.log(`[Webhook Clerk] ✅ Usuário atualizado: ${email}`);
    return;
  }

  // Inserir apenas se NÃO existir
  console.log(`[Webhook Clerk] ➕ Criando novo usuário: ${email}`);

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
      console.warn('[Webhook Clerk] ⚠️ Tentativa de criar usuário duplicado (constraint violation):', {
        email: email,
        clerk_id: data.id,
        error: error.message
      });

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

        console.log(`[Webhook Clerk] ✅ Usuário duplicado atualizado: ${email}`);
        return;
      }

      throw new Error(`Duplicação não resolvida para: ${email}`);
    }

    throw new Error(`Erro ao criar usuário: ${error.message}`);
  }

  console.log(`[Webhook Clerk] ✅ Novo usuário criado: ${email} (ID: ${newUser?.id})`);
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
  console.log(`[Webhook Clerk] 🔄 user.updated: ${email} (clerk_id: ${data.id})`);

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

  console.log(`[Webhook Clerk] ✅ Usuário atualizado com sucesso: ${email}`);
}

/**
 * Handler: Usuário deletado
 */
async function handleUserDeleted(data: any, eventId: string): Promise<void> {
  console.log(`[Webhook Clerk] 🗑️ user.deleted: clerk_id ${data.id}`);

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('clerk_id', data.id);

  if (error) {
    throw new Error(`Erro ao deletar usuário: ${error.message}`);
  }

  console.log(`[Webhook Clerk] ✅ Usuário deletado com sucesso: ${data.id}`);
}

// Configurar como edge function
export const runtime = 'edge';
