import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET - Listar todos os tickets (Admin)
 * Query params: status, priority, category, page, limit, search
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Query base
    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        users!support_tickets_user_id_fkey (
          id,
          email,
          name,
          plan,
          is_paid
        )
      `, { count: 'exact' })
      .order('updated_at', { ascending: false });

    // Filtros
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`subject.ilike.%${search}%`);
    }

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data: tickets, count, error } = await query;

    if (error) throw error;

    // Buscar contagem de mensagens e última mensagem para cada ticket
    const ticketIds = (tickets || []).map(t => t.id);
    
    let messagesInfo: Record<string, { count: number; lastMessage: any }> = {};
    
    if (ticketIds.length > 0) {
      const { data: messages } = await supabaseAdmin
        .from('ticket_messages')
        .select('ticket_id, message, sender_type, created_at')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: false });

      // Agrupar por ticket
      (messages || []).forEach(msg => {
        if (!messagesInfo[msg.ticket_id]) {
          messagesInfo[msg.ticket_id] = { 
            count: 0, 
            lastMessage: {
              message: msg.message?.substring(0, 100),
              sender_type: msg.sender_type,
              created_at: msg.created_at
            }
          };
        }
        messagesInfo[msg.ticket_id].count++;
      });
    }

    // Combinar dados
    const ticketsWithInfo = (tickets || []).map(ticket => ({
      ...ticket,
      message_count: messagesInfo[ticket.id]?.count || 0,
      last_message: messagesInfo[ticket.id]?.lastMessage || null,
      user: ticket.users
    }));

    // Contadores por status
    const { data: statusCounts } = await supabaseAdmin
      .from('support_tickets')
      .select('status')
      .then(res => {
        const counts: Record<string, number> = { open: 0, in_progress: 0, waiting_user: 0, resolved: 0, closed: 0 };
        (res.data || []).forEach(t => {
          counts[t.status] = (counts[t.status] || 0) + 1;
        });
        return { data: counts };
      });

    return NextResponse.json({
      tickets: ticketsWithInfo,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      counts: statusCounts
    });

  } catch (error: any) {
    console.error('[Admin Support] Erro ao listar tickets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
