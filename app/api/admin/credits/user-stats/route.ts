import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PLAN_LIMITS as BILLING_LIMITS } from '@/lib/billing/limits';

export async function GET(req: Request) {
  try {
    // 1. 🔒 VERIFICAR ADMIN
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // 2. 📊 BUSCAR PARÂMETROS
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // 3. 📧 BUSCAR USUÁRIO COMPLETO (case-insensitive)
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, plan, credits, usage_this_month, is_paid, admin_courtesy, admin_courtesy_expires_at, subscription_status')
      .ilike('email', `%${userEmail}%`)
      .single();

    if (userError || !targetUser) {
      console.log(`[Credits Stats] Usuário não encontrado: ${userEmail}`);
      return NextResponse.json(
        { error: `Usuário não encontrado com o email: ${userEmail}` },
        { status: 404 }
      );
    }

    const plan = targetUser.plan || 'free';
    const usage = targetUser.usage_this_month || {};

    // 4. 📊 CALCULAR PRÓXIMO RESET
    const now = new Date();
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // 5. 📊 BUSCAR LIMITES DO PLANO (Billing System)
    const billingLimits = BILLING_LIMITS[plan as keyof typeof BILLING_LIMITS];
    
    // 6. 📊 BUSCAR USO ATUAL DO MÊS (ai_usage table)
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { count: editorCount } = await supabaseAdmin
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUser.id)
      .eq('usage_type', 'editor_generation')
      .gte('created_at', firstDayOfMonth.toISOString());

    const { count: aiCount } = await supabaseAdmin
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUser.id)
      .eq('usage_type', 'ai_request')
      .gte('created_at', firstDayOfMonth.toISOString());

    const { count: toolsCount } = await supabaseAdmin
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUser.id)
      .eq('usage_type', 'tool_usage')
      .gte('created_at', firstDayOfMonth.toISOString());

    // 7. ✅ RETORNAR ESTATÍSTICAS COMPLETAS
    return NextResponse.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        plan: targetUser.plan,
        is_paid: targetUser.is_paid,
        admin_courtesy: targetUser.admin_courtesy,
        admin_courtesy_expires_at: targetUser.admin_courtesy_expires_at,
        subscription_status: targetUser.subscription_status
      },
      credits: {
        balance: targetUser.credits || 0
      },
      usage: {
        editor: {
          used: editorCount || 0,
          limit: billingLimits?.editorGenerations || 0,
          percentage: billingLimits?.editorGenerations 
            ? Math.round(((editorCount || 0) / billingLimits.editorGenerations) * 100)
            : 0
        },
        ai: {
          used: aiCount || 0,
          limit: billingLimits?.aiRequests || 0,
          percentage: billingLimits?.aiRequests 
            ? Math.round(((aiCount || 0) / billingLimits.aiRequests) * 100)
            : 0
        },
        tools: {
          used: toolsCount || 0,
          limit: billingLimits?.toolsUsage || 0,
          percentage: billingLimits?.toolsUsage 
            ? Math.round(((toolsCount || 0) / billingLimits.toolsUsage) * 100)
            : 0
        }
      },
      limits: billingLimits,
      nextReset: nextReset.toISOString()
    });

  } catch (error: any) {
    console.error('[Credits Stats] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
