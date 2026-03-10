import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const GET = withAdminAuth(async (req) => {
  // PARÂMETROS DE BUSCA
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  const queryTerm = searchParams.get('query');
  const status = searchParams.get('status');
  const method = searchParams.get('method');

  // CONSULTAR PAGAMENTOS
  let query = supabaseAdmin
    .from('payments')
    .select(`
      *,
      user:users (email, name)
    `, { count: 'exact' });

  if (queryTerm) {
    // Sanitizar e limitar input para prevenir SQL injection
    const sanitizedTerm = queryTerm.slice(0, 100).replace(/[%_\\]/g, '\\$&');

    // Tentar encontrar usuário por email ou nome
    const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(`email.ilike.%${sanitizedTerm}%,name.ilike.%${sanitizedTerm}%`)
        .limit(20);

    if (users && users.length > 0) {
        const ids = users.map(u => u.id);

        if (/^(sub_|pi_|ch_|pay_)/.test(queryTerm)) {
           query = query.or(`stripe_payment_id.eq.${queryTerm},stripe_subscription_id.eq.${queryTerm},asaas_payment_id.eq.${queryTerm}`);
        } else {
           query = query.in('user_id', ids);
        }
    } else {
        if (/^(sub_|pi_|ch_|pay_)/.test(queryTerm)) {
          query = query.or(`stripe_payment_id.eq.${queryTerm},stripe_subscription_id.eq.${queryTerm},asaas_payment_id.eq.${queryTerm}`);
        }
    }
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (method) {
    query = query.eq('payment_method', method);
  }

  // Ordenação e Paginação
  const { data: payments, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('[Transactions] Erro ao buscar pagamentos', { error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // CALCULAR TOTAL FINANCEIRO (Geral)
  const { data: totalData, error: totalError } = await supabaseAdmin
    .from('payments')
    .select('amount, currency')
    .eq('is_test', false)
    .or('status.eq.succeeded,status.eq.paid');

  let totalRevenue = 0;
  if (totalData) {
    totalRevenue = totalData.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }

  return NextResponse.json({
    payments,
    totalRevenue,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
});
