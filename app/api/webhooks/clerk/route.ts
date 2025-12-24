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

  console.log(`📩 Webhook Clerk: ${type}`);

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
      console.log(`Evento não tratado: ${type}`);
  }

  return new NextResponse('OK', { status: 200 });
}

// Handler: Usuário criado
async function handleUserCreated(data: any) {
  try {
    const email = data.email_addresses[0]?.email_address;
    const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Usuário';

    console.log(`✅ Criando usuário: ${email}`);

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
      console.error('Erro ao criar usuário:', error);
    } else {
      console.log(`✅ Usuário criado: ${email}`);
    }
  } catch (error) {
    console.error('Erro em handleUserCreated:', error);
  }
}

// Handler: Usuário atualizado
async function handleUserUpdated(data: any) {
  try {
    const email = data.email_addresses[0]?.email_address;
    const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Usuário';

    console.log(`🔄 Atualizando usuário: ${email}`);

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
    console.log(`🗑️  Deletando usuário: ${data.id}`);

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
