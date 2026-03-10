import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/api-middleware';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Obter detalhes do ticket com mensagens
 */
export const GET = withAuth(async (req, { userId, user }, context: RouteContext) => {
  const { id: ticketId } = await context.params;

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
  }

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
});

/**
 * POST - Enviar nova mensagem no ticket
 */
export const POST = withAuth(async (req, { userId, user }, context: RouteContext) => {
  const { id: ticketId } = await context.params;
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
});

/**
 * PATCH - Atualizar ticket (fechar/reabrir)
 */
export const PATCH = withAuth(async (req, { userId, user }, context: RouteContext) => {
  const { id: ticketId } = await context.params;
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
});
