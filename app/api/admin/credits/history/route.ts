import { withAdminAuth } from '@/lib/api-middleware';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const GET = withAdminAuth(async (req) => {
  // 1. 📊 BUSCAR PARÂMETROS
  const { searchParams } = new URL(req.url);
  const userEmail = searchParams.get('userEmail');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!userEmail) {
    return NextResponse.json(
      { error: 'Email do usuário é obrigatório' },
      { status: 400 }
    );
  }

  const offset = (page - 1) * limit;

  // 2. 📧 BUSCAR USUÁRIO (case-insensitive)
  const { data: targetUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .ilike('email', userEmail)
    .single();

  if (userError || !targetUser) {
    return NextResponse.json(
      { error: 'Usuário não encontrado' },
      { status: 404 }
    );
  }

  // 3. 📜 BUSCAR HISTÓRICO DE TRANSAÇÕES
  const { data: transactions, error: txError, count } = await supabaseAdmin
    .from('credit_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', targetUser.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (txError) {
    logger.error('[Credits History] Erro ao buscar transações', { error: txError });
    return NextResponse.json(
      { error: 'Erro ao buscar histórico' },
      { status: 500 }
    );
  }

  // 4. 📜 BUSCAR HISTÓRICO DE USO (ai_usage)
  const { data: usageHistory, error: usageError } = await supabaseAdmin
    .from('ai_usage')
    .select('*')
    .eq('user_id', targetUser.id)
    .order('created_at', { ascending: false })
    .limit(100); // Últimas 100 operações

  if (usageError) {
    logger.error('[Credits History] Erro ao buscar uso', { error: usageError });
  }

  // 5. ✅ RETORNAR DADOS
  return NextResponse.json({
    user: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name
    },
    transactions: transactions || [],
    usageHistory: usageHistory || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
});
