export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * API: GET /api/gallery
 * Retorna imagens geradas (stencils) do usuário logado
 * Usado na ferramenta DIVIDIR para facilitar seleção de imagens existentes
 */
export const GET = withAuth(async (req, { userId, user }) => {
  // Buscar projetos/stencils do usuário
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from('projects')
    .select('id, name, stencil_image, style, created_at, width_cm, height_cm')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (projectsError) {
    logger.error('[Gallery] Erro ao buscar projetos', projectsError);
    return NextResponse.json(
      { error: 'Erro ao buscar imagens' },
      { status: 500 }
    );
  }

  // Mapear para formato esperado pela galeria
  const images = (projects || []).map(project => ({
    id: project.id,
    name: project.name || 'Sem nome',
    url: project.stencil_image,
    style: project.style || 'standard',
    createdAt: project.created_at,
    width: project.width_cm,
    height: project.height_cm
  }));

  logger.debug('[Gallery] Imagens retornadas', { count: images.length, userId });

  return NextResponse.json({
    images,
    count: images.length
  });
});
