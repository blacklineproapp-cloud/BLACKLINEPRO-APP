import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: { id: string };
}

/**
 * GET - Obter detalhes do ticket com mensagens
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await getOrCreateUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const ticketId = params.id;

    // Buscar ticket (verificando que pertence ao usuário)
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    // Buscar mensagens
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return NextResponse.json({ 
      ticket,
      messages: messages || []
    });

  } catch (error: any) {
    console.error('[Support] Erro ao buscar ticket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - Enviar nova mensagem no ticket
 * Body: { message }
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await getOrCreateUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const ticketId = params.id;
    const body = await req.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    // Verificar que ticket pertence ao usuário
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('id, status')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    // Verificar se ticket está fechado
    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Este ticket está fechado' }, { status: 400 });
    }

    // Inserir mensagem
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_type: 'user',
        message: message.trim(),
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Atualizar status do ticket se estava aguardando usuário
    if (ticket.status === 'waiting_user') {
      await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'open' })
        .eq('id', ticketId);
    }

    // Atualizar updated_at do ticket
    await supabaseAdmin
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    return NextResponse.json({ 
      success: true,
      message: newMessage
    });

  } catch (error: any) {
    console.error('[Support] Erro ao enviar mensagem:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH - Atualizar ticket (fechar/reabrir)
 * Body: { action: 'close' | 'reopen' }
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await getOrCreateUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const ticketId = params.id;
    const body = await req.json();
    const { action } = body;

    // Verificar que ticket pertence ao usuário
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('id, status')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    if (action === 'close') {
      await supabaseAdmin
        .from('support_tickets')
        .update({ 
          status: 'closed',
          resolved_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      return NextResponse.json({ success: true, message: 'Ticket fechado' });
    }

    if (action === 'reopen') {
      if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
        return NextResponse.json({ error: 'Ticket já está aberto' }, { status: 400 });
      }

      await supabaseAdmin
        .from('support_tickets')
        .update({ 
          status: 'open',
          resolved_at: null,
          resolved_by: null
        })
        .eq('id', ticketId);

      return NextResponse.json({ success: true, message: 'Ticket reaberto' });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error: any) {
    console.error('[Support] Erro ao atualizar ticket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
