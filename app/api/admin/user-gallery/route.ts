import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * API Admin: GET /api/admin/user-gallery
 * Retorna projetos (Editor) e stencils (IA Gen) de um usuário específico
 * Apenas para admins
 */
export const GET = withAdminAuth(async (req) => {
  // Extrair userId da query
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get('userId');
  const type = searchParams.get('type'); // 'editor' ou 'ia-gen'

  if (!targetUserId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
  }

  if (type === 'editor') {
    logger.info('[Admin Gallery] Buscando projetos', { targetUserId });

    // Buscar projetos do Editor - incluir original_image para toggle
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('id, name, thumbnail_url, stencil_image, original_image, style, created_at, width_cm, height_cm')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    logger.debug('[Admin Gallery] Projetos encontrados', { count: projects?.length || 0 });
    if (error) {
      logger.error('[Admin Gallery] Erro ao buscar projetos', { error });
      return NextResponse.json({ error: 'Erro ao buscar projetos', details: error.message }, { status: 500 });
    }

    const images = (projects || [])
      .filter(project => project.thumbnail_url || project.stencil_image)
      .map(project => ({
        id: project.id,
        image_url: project.thumbnail_url || project.stencil_image,
        full_image_url: project.stencil_image,
        is_thumbnail: !!project.thumbnail_url,
        created_at: project.created_at,
        metadata: {
          name: project.name,
          style: project.style,
          width: project.width_cm,
          height: project.height_cm,
          original_image: project.original_image
        }
      }));

    logger.debug('[Admin Gallery] Imagens mapeadas', { count: images.length, thumbnails: images.filter(i => i.is_thumbnail).length });

    return NextResponse.json({ images, count: images.length });

  } else if (type === 'ia-gen') {
    logger.info('[Admin Gallery] Buscando gerações IA', { targetUserId });

    // Buscar gerações de IA
    const { data: generations, error } = await supabaseAdmin
      .from('ai_usage')
      .select('id, created_at, metadata')
      .eq('user_id', targetUserId)
      .eq('usage_type', 'ai_request')
      .order('created_at', { ascending: false })
      .limit(50);

    logger.debug('[Admin Gallery] Gerações encontradas', { count: generations?.length || 0 });
    if (error) {
      logger.error('[Admin Gallery] Erro ao buscar gerações IA', { error });
      return NextResponse.json({ error: 'Erro ao buscar gerações', details: error }, { status: 500 });
    }

    // Filtrar apenas as que têm image_url no metadata
    const images = (generations || [])
      .filter(gen => gen.metadata && typeof gen.metadata === 'object' && gen.metadata.image_url)
      .map(gen => ({
        id: gen.id,
        image_url: gen.metadata.image_url,
        created_at: gen.created_at,
        metadata: gen.metadata
      }));

    logger.debug('[Admin Gallery] Imagens IA mapeadas', { count: images.length, firstImage: images[0] });

    return NextResponse.json({ images, count: images.length });

  } else {
    return NextResponse.json({ error: 'type deve ser "editor" ou "ia-gen"' }, { status: 400 });
  }
});
