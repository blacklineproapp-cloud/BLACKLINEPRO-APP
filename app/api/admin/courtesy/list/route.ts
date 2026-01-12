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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all'; // all, active, expired
    const plan = searchParams.get('plan') || 'all';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // 3. 🔍 CONSTRUIR QUERY
    let query = supabaseAdmin
      .from('users')
      .select('id, email, name, plan, admin_courtesy, admin_courtesy_expires_at, admin_courtesy_granted_at, admin_courtesy_granted_by, created_at', { count: 'exact' })
      .eq('admin_courtesy', true);

    // Filtrar por status
    if (status === 'active') {
      query = query.gte('admin_courtesy_expires_at', new Date().toISOString());
    } else if (status === 'expired') {
      query = query.lt('admin_courtesy_expires_at', new Date().toISOString());
    }

    // Filtrar por plano
    if (plan !== 'all') {
      query = query.eq('plan', plan);
    }

    // Busca por email/nome
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // Ordenar e paginar
    const { data: courtesies, error, count } = await query
      .order('admin_courtesy_granted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Courtesy List] Erro:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar cortesias' },
        { status: 500 }
      );
    }

    // 4. 📊 CALCULAR ESTATÍSTICAS
    const now = new Date();
    const stats = {
      total: count || 0,
      active: courtesies?.filter(c => c.admin_courtesy_expires_at && new Date(c.admin_courtesy_expires_at) > now).length || 0,
      expired: courtesies?.filter(c => c.admin_courtesy_expires_at && new Date(c.admin_courtesy_expires_at) <= now).length || 0
    };

    // 5. ✅ RETORNAR DADOS
    return NextResponse.json({
      courtesies: courtesies || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats
    });

  } catch (error: any) {
    console.error('[Courtesy List] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
