import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET não configurado');
  }

  // Pegar headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
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
    console.error('Erro ao verificar webhook:', err);
    return new NextResponse('Assinatura inválida', { status: 400 });
  }

  // Processar evento
  const { type, data } = evt;

  switch (type) {
    case 'user.created':
      await handleUserCreated(data);
      break;

    case 'user.updated':
      await handleUserUpdated(data);
      break;

    case 'user.deleted':
      await handleUserDeleted(data);
      break;

    default:
  }

  return new NextResponse('OK', { status: 200 });
}

// Handler: Usuário criado
async function handleUserCreated(data: any) {
  try {
    const email = data.email_addresses[0]?.email_address;
    const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Usuário';

    // PROTEÇÃO CONTRA DUPLICAÇÃO:
    // 1. Verificar se usuário já existe (por clerk_id OU email)
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id, clerk_id, email')
      .or(`clerk_id.eq.${data.id},email.eq.${email}`)
      .maybeSingle();

    if (existing) {

      // Atualizar dados do usuário existente
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          clerk_id: data.id, // Atualizar clerk_id caso email já existia
          email: email,
          name: name,
          picture: data.image_url || null,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Erro ao atualizar usuário existente:', updateError);
      } else {
      }
      return;
    }

    // 2. Inserir apenas se NÃO existir
    const { error } = await supabaseAdmin.from('users').insert({
      clerk_id: data.id,
      email: email,
      name: name,
      picture: data.image_url || null,
      subscription_status: 'inactive',
      is_paid: false,
      tools_unlocked: false,
    });

    if (error) {
      console.error('❌ Erro ao criar usuário:', error);
    } else {
    }
  } catch (error) {
    console.error('❌ Erro em handleUserCreated:', error);
  }
}

// Handler: Usuário atualizado
async function handleUserUpdated(data: any) {
  try {
    const email = data.email_addresses[0]?.email_address;
    const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Usuário';

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        email: email,
        name: name,
        picture: data.image_url || null,
      })
      .eq('clerk_id', data.id);

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
    }
  } catch (error) {
    console.error('Erro em handleUserUpdated:', error);
  }
}

// Handler: Usuário deletado
async function handleUserDeleted(data: any) {
  try {

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('clerk_id', data.id);

    if (error) {
      console.error('Erro ao deletar usuário:', error);
    }
  } catch (error) {
    console.error('Erro em handleUserDeleted:', error);
  }
}

// Configurar como edge function
export const runtime = 'edge';
