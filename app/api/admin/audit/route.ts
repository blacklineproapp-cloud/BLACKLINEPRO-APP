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

    // Filtros opcionais
    const action = searchParams.get('action');
    const adminId = searchParams.get('adminId');

    // 3. 📊 CONSULTAR LOGS
    let query = supabaseAdmin
      .from('admin_logs')
      .select(`
        *,
        admin:admin_user_id (email, name),
        target:target_user_id (email)
      `, { count: 'exact' });

    if (action) {
      query = query.eq('action', action);
    }

    if (adminId) {
      query = query.eq('admin_user_id', adminId);
    }

    // Ordenação e Paginação
    const { data: logs, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      logs,
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
