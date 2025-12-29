import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * API: GET /api/gallery
 * Retorna imagens geradas (stencils) do usuário logado
 * Usado na ferramenta DIVIDIR para facilitar seleção de imagens existentes
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar usuário no Supabase via clerk_id
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar projetos/stencils do usuário
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, name, stencil_image, style, created_at, width_cm, height_cm')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50); // Limitar a 50 imagens mais recentes

    if (projectsError) {
      console.error('[Gallery] Erro ao buscar projetos:', projectsError);
      return NextResponse.json(
        { error: 'Erro ao buscar imagens' },
        { status: 500 }
      );
    }

    // Mapear para formato esperado pela galeria
    const images = (projects || []).map(project => ({
      id: project.id,
      name: project.name || 'Sem nome',
      url: project.stencil_image, // Base64 ou URL do storage
      style: project.style || 'standard',
      createdAt: project.created_at,
      width: project.width_cm,
      height: project.height_cm
    }));

    console.log(`[Gallery] Retornando ${images.length} imagens para usuário ${userId}`);

    return NextResponse.json({
      images,
      count: images.length
    });

  } catch (error: any) {
    console.error('[Gallery] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar galeria' },
      { status: 500 }
    );
  }
}
