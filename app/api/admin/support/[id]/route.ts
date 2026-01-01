import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin, getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { invalidateCache } from '@/lib/cache';

interface RouteParams {
  params: { id: string };
}

/**
 * GET - Obter detalhes do ticket com mensagens (Admin)
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const ticketId = params.id;

    // Buscar ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      console.error('[Admin Support] Erro ao buscar ticket:', ticketError);
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    // Buscar dados do usuário separadamente
    const { data: ticketUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, plan, is_paid, is_blocked, subscription_status, tools_unlocked, clerk_id, created_at')
      .eq('id', ticket.user_id)
      .single();

    if (userError || !ticketUser) {
      console.error('[Admin Support] Erro ao buscar usuário do ticket:', userError);
      return NextResponse.json({
        error: 'Usuário do ticket não encontrado. Possível problema de integridade de dados.'
      }, { status: 500 });
    }

    // Buscar mensagens
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[Admin Support] Erro ao buscar mensagens:', messagesError);
    }

    // Buscar uso do usuário (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: usage } = await supabaseAdmin
      .from('ai_usage')
      .select('operation')
      .eq('user_id', ticket.user_id)
      .gte('created_at', sevenDaysAgo.toISOString());

    return NextResponse.json({ 
      ticket: {
        ...ticket,
        user: ticketUser
      },
      messages: messages || [],
      userStats: {
        requests_7d: usage?.length || 0,
      }
    });

  } catch (error: any) {
    console.error('[Admin Support] Erro ao buscar ticket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - Responder ticket ou executar ação (Admin)
 * Body: { message?, action?, actionData? }
 * 
 * Actions disponíveis:
 * - change_plan: { plan: 'free' | 'starter' | 'pro' | 'studio' }
 * - unblock: {}
 * - clear_cache: {}
 * - reset_usage: {}
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const admin = await getOrCreateUser(userId);
    if (!admin) {
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 });
    }

    const ticketId = params.id;
    const body = await req.json();
    const { message, action, actionData } = body;

    // Buscar ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*, users!support_tickets_user_id_fkey ( id, email, clerk_id, plan )')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
    }

    const targetUser = ticket.users;

    // Se há ação, executar
    let actionResult = null;
    if (action) {
      actionResult = await executeAction(action, actionData, targetUser, admin);
    }

    // Se há mensagem, inserir
    if (message?.trim()) {
      await supabaseAdmin
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: admin.id,
          sender_type: 'admin',
          message: message.trim(),
          action_taken: actionResult ? {
            type: action,
            data: actionData,
            result: actionResult.success ? 'success' : 'error',
            details: actionResult.message
          } : null
        });
    } else if (actionResult) {
      // Se só executou ação sem mensagem, registrar
      await supabaseAdmin
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: admin.id,
          sender_type: 'admin',
          message: `[Ação executada: ${getActionLabel(action)}] ${actionResult.message}`,
          action_taken: {
            type: action,
            data: actionData,
            result: actionResult.success ? 'success' : 'error'
          }
        });
    }

    // Atualizar status do ticket
    await supabaseAdmin
      .from('support_tickets')
      .update({ 
        status: 'waiting_user',
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    return NextResponse.json({ 
      success: true,
      actionResult
    });

  } catch (error: any) {
    console.error('[Admin Support] Erro ao responder ticket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH - Atualizar status/prioridade do ticket (Admin)
 * Body: { status?, priority?, resolved? }
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const admin = await getOrCreateUser(userId);
    const ticketId = params.id;
    const body = await req.json();
    const { status, priority, resolved } = body;

    const updates: any = { updated_at: new Date().toISOString() };

    if (status) {
      updates.status = status;
    }
    if (priority) {
      updates.priority = priority;
    }
    if (resolved) {
      updates.status = 'resolved';
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = admin?.id;
    }

    const { error } = await supabaseAdmin
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Admin Support] Erro ao atualizar ticket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// HELPERS
// ============================================

async function executeAction(
  action: string, 
  data: any, 
  user: any,
  admin: any
): Promise<{ success: boolean; message: string }> {
  try {
    switch (action) {
      case 'change_plan': {
        const { plan } = data;
        if (!['free', 'starter', 'pro', 'studio'].includes(plan)) {
          return { success: false, message: 'Plano inválido' };
        }

        const updates: any = { plan };
        if (plan === 'free') {
          updates.is_paid = false;
          updates.tools_unlocked = false;
          updates.subscription_status = 'inactive';
        } else {
          updates.is_paid = true;
          updates.tools_unlocked = plan === 'pro' || plan === 'studio';
          updates.subscription_status = 'active';
        }

        await supabaseAdmin
          .from('users')
          .update(updates)
          .eq('id', user.id);

        // Invalidar cache
        if (user.clerk_id) {
          await invalidateCache(user.clerk_id, 'users');
        }

        // Log
        await supabaseAdmin.from('admin_logs').insert({
          admin_user_id: admin.id,
          action: 'change_plan',
          target_user_id: user.id,
          details: { from: user.plan, to: plan, via: 'support_ticket' }
        });

        return { success: true, message: `Plano alterado de ${user.plan} para ${plan}` };
      }

      case 'unblock': {
        await supabaseAdmin
          .from('users')
          .update({
            is_blocked: false,
            blocked_reason: null,
            blocked_at: null,
            blocked_by: null
          })
          .eq('id', user.id);

        await supabaseAdmin.from('admin_logs').insert({
          admin_user_id: admin.id,
          action: 'unblock_user',
          target_user_id: user.id,
          details: { via: 'support_ticket' }
        });

        return { success: true, message: 'Usuário desbloqueado' };
      }

      case 'clear_cache': {
        if (user.clerk_id) {
          await invalidateCache(user.clerk_id, 'users');
          return { success: true, message: 'Cache limpo com sucesso' };
        }
        return { success: false, message: 'Clerk ID não encontrado' };
      }

      case 'reset_usage': {
        await supabaseAdmin
          .from('users')
          .update({
            usage_this_month: {},
            daily_usage: {}
          })
          .eq('id', user.id);

        await supabaseAdmin.from('admin_logs').insert({
          admin_user_id: admin.id,
          action: 'reset_usage',
          target_user_id: user.id,
          details: { via: 'support_ticket' }
        });

        return { success: true, message: 'Contador de uso resetado' };
      }

      default:
        return { success: false, message: 'Ação não reconhecida' };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    change_plan: 'Alterar Plano',
    unblock: 'Desbloquear Usuário',
    clear_cache: 'Limpar Cache',
    reset_usage: 'Resetar Uso'
  };
  return labels[action] || action;
}
