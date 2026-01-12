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

    // 2. 📊 BUSCAR PARÂMETROS
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

    // 3. 📧 BUSCAR USUÁRIO (case-insensitive)
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

    // 4. 📜 BUSCAR HISTÓRICO DE TRANSAÇÕES
    const { data: transactions, error: txError, count } = await supabaseAdmin
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', targetUser.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (txError) {
      console.error('[Credits History] Erro ao buscar transações:', txError);
      return NextResponse.json(
        { error: 'Erro ao buscar histórico' },
        { status: 500 }
      );
    }

    // 5. 📜 BUSCAR HISTÓRICO DE USO (ai_usage)
    const { data: usageHistory, error: usageError } = await supabaseAdmin
      .from('ai_usage')
      .select('*')
      .eq('user_id', targetUser.id)
      .order('created_at', { ascending: false })
      .limit(100); // Últimas 100 operações

    if (usageError) {
      console.error('[Credits History] Erro ao buscar uso:', usageError);
    }

    // 6. ✅ RETORNAR DADOS
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

  } catch (error: any) {
    console.error('[Credits History] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
