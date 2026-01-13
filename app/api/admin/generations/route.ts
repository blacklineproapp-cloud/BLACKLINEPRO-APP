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

    const userEmail = searchParams.get('userEmail');

    // 3. 🖼️ CONSULTAR PROJETOS (Tabela 'projects')
    // Usamos projects porque é onde a imagem original e stencil são salvos
    let query = supabaseAdmin
      .from('projects')
      .select(`
        *,
        user:user_id (email, name)
      `, { count: 'exact' });

    if (userEmail) {
       // Filtro por usuário (requires user join filter workaround or manual fetch)
       // Let's first look up user ID again to be safe and efficient
       const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', `%${userEmail}%`)
        .single();
        
       if (userData) {
         query = query.eq('user_id', userData.id);
       } else {
         // Se filtrou por email e não achou user, retorna vazio
         return NextResponse.json({ projects: [], pagination: { total: 0 } });
       }
    }

    // Ordenação e Paginação (Mais recentes primeiro)
    const { data: projects, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar projetos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      projects,
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
