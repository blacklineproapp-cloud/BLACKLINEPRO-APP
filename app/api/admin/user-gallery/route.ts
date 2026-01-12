import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

/**
 * API Admin: GET /api/admin/user-gallery
 * Retorna projetos (Editor) e stencils (IA Gen) de um usuário específico
 * Apenas para admins
 */
export async function GET(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const userIsAdmin = await isAdmin(clerkId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Extrair userId da query
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'editor' ou 'ia-gen'

    if (!targetUserId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    if (type === 'editor') {
      console.log('[Admin Gallery] Buscando projetos para userId:', targetUserId);
      
      // Buscar projetos do Editor - incluir original_image para toggle
      const { data: projects, error } = await supabaseAdmin
        .from('projects')
        .select('id, name, thumbnail_url, stencil_image, original_image, style, created_at, width_cm, height_cm')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('[Admin Gallery] Projetos encontrados:', projects?.length || 0);
      if (error) {
        console.error('[Admin Gallery] Erro ao buscar projetos:', error);
        return NextResponse.json({ error: 'Erro ao buscar projetos', details: error.message }, { status: 500 });
      }

      const images = (projects || [])
        .filter(project => project.thumbnail_url || project.stencil_image)
        .map(project => ({
          id: project.id,
          image_url: project.thumbnail_url || project.stencil_image, // Thumbnail para grid
          full_image_url: project.stencil_image, // Stencil full
          is_thumbnail: !!project.thumbnail_url,
          created_at: project.created_at,
          metadata: {
            name: project.name,
            style: project.style,
            width: project.width_cm,
            height: project.height_cm,
            original_image: project.original_image // Para toggle Original/Stencil
          }
        }));

      console.log('[Admin Gallery] Imagens mapeadas:', images.length);
      console.log('[Admin Gallery] Thumbnails:', images.filter(i => i.is_thumbnail).length);
      
      return NextResponse.json({ images, count: images.length });

    } else if (type === 'ia-gen') {
      console.log('[Admin Gallery] Buscando gerações IA para userId:', targetUserId);
      
      // Buscar gerações de IA
      const { data: generations, error } = await supabaseAdmin
        .from('ai_usage')
        .select('id, created_at, metadata')
        .eq('user_id', targetUserId)
        .eq('usage_type', 'ai_request')
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('[Admin Gallery] Gerações encontradas:', generations?.length || 0);
      if (error) {
        console.error('[Admin Gallery] Erro ao buscar gerações IA:', error);
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

      console.log('[Admin Gallery] Imagens IA mapeadas:', images.length);
      console.log('[Admin Gallery] Primeira imagem IA:', images[0]);
      
      return NextResponse.json({ images, count: images.length });

    } else {
      return NextResponse.json({ error: 'type deve ser "editor" ou "ia-gen"' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[Admin Gallery] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar galeria' },
      { status: 500 }
    );
  }
}
