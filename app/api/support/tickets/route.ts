import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

// Categorias válidas
const VALID_CATEGORIES = ['billing', 'technical', 'account', 'feature', 'general'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

/**
 * GET - Listar tickets do usuário autenticado
 */
export const GET = withAuth(async (req, { userId, user }) => {
  // Buscar tickets do usuário com última mensagem
  const { data: tickets, error } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      *,
      ticket_messages (
        id,
        message,
        sender_type,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Processar para incluir última mensagem
  const ticketsWithLastMessage = (tickets || []).map(ticket => {
    const messages = ticket.ticket_messages || [];
    const lastMessage = messages.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    return {
      ...ticket,
      last_message: lastMessage?.message?.substring(0, 100) || null,
      last_message_by: lastMessage?.sender_type || null,
      message_count: messages.length,
      ticket_messages: undefined
    };
  });

  return NextResponse.json({ tickets: ticketsWithLastMessage });
});

/**
 * POST - Criar novo ticket
 */
export const POST = withAuth(async (req, { userId, user }) => {
  const body = await req.json();
  const { subject, category = 'general', priority = 'normal', message } = body;

  // Validações
  if (!subject?.trim()) {
    return NextResponse.json({ error: 'Assunto é obrigatório' }, { status: 400 });
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 });
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: 'Prioridade inválida' }, { status: 400 });
  }

  // Criar ticket
  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      user_id: user.id,
      subject: subject.trim(),
      category,
      priority,
      status: 'open',
      metadata: {
        user_email: user.email,
        user_plan: user.plan,
      }
    })
    .select()
    .single();

  if (ticketError) throw ticketError;

  // Criar primeira mensagem com anexos
  const { error: messageError } = await supabaseAdmin
    .from('ticket_messages')
    .insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      sender_type: 'user',
      message: message.trim(),
      attachments: body.attachments || [],
    });

  if (messageError) throw messageError;

  logger.info('[Support] Ticket criado', { ticketId: ticket.id });

  return NextResponse.json({
    success: true,
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      created_at: ticket.created_at
    }
  });
});
