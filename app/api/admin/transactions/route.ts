import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

    // 2. 🔍 PARÂMETROS DE BUSCA
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    const queryTerm = searchParams.get('query'); // Email, ID ou Stripe ID
    const status = searchParams.get('status');
    const method = searchParams.get('method');

    // 3. 📊 CONSULTAR PAGAMENTOS
    // Corrigido: Remover customer:customer_id que causava erro 500 (coluna texto, não relação)
    // Usar 'users' explícito para relação se user_id for FK
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

      // Se achou usuários, busca pagamentos deles OU busca por ID de pagamento/assinatura direto
      if (users && users.length > 0) {
          const ids = users.map(u => u.id);
          // Complex OR logic: (user_id IN users) OR (stripe_id matches)
          // PostgREST doesn't support mixing IN and OR easily for different fields in one string syntax.
          // Estratégia: Se parecem ser usuários, foca neles. Se não, tenta ID.
          // Como OR é difícil aqui, vamos assumir: se achou users por nome, mostra os deles.
          // Se o termo parece um ID (começa com sub_ ou pi_ ou ch_ ou pay_), ignora users.

          if (/^(sub_|pi_|ch_|pay_)/.test(queryTerm)) {
             // IDs são seguros pois começam com prefixo conhecido - usar valor original
             query = query.or(`stripe_payment_id.eq.${queryTerm},stripe_subscription_id.eq.${queryTerm},asaas_payment_id.eq.${queryTerm}`);
          } else {
             query = query.in('user_id', ids);
          }
      } else {
          // Não achou users, tenta match exato de ID (validar formato primeiro)
          if (/^(sub_|pi_|ch_|pay_)/.test(queryTerm)) {
            query = query.or(`stripe_payment_id.eq.${queryTerm},stripe_subscription_id.eq.${queryTerm},asaas_payment_id.eq.${queryTerm}`);
          }
          // Se não é um ID válido e não achou users, não filtra (evita injection)
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
      console.error('Erro ao buscar pagamentos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. 💰 CALCULAR TOTAL FINANCEIRO (Geral)
    // Nota: Em um banco grande, isso deveria ser uma query separada ou materializada.
    // Aqui faremos uma query de agregação simples filtrando testes.
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
      totalRevenue, // Retorna o valor total calculado
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
