import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadImage, ensureBucketExists } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import { getOrSetCache, invalidateCache } from '@/lib/cache';

// GET - Listar projetos do usuário
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar projetos com cache (2 minutos)
    const projectsFormatted = await getOrSetCache(
      userId,
      async () => {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('clerk_id', userId)
          .single();

        if (!user) {
          throw new Error('Usuário não encontrado');
        }

        const { data: projects, error } = await supabaseAdmin
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Compatibilidade: usar URL se disponível, senão usar Base64 legado
        return projects?.map(project => ({
          ...project,
          // Priorizar URLs do Storage sobre Base64
          original_image: project.original_image_url || project.original_image,
          stencil_image: project.stencil_image_url || project.stencil_image,
        })) || [];
      },
      {
        ttl: 120000, // 2 minutos
        tags: [`user:${userId}`, 'projects'],
        namespace: 'projects',
      }
    );

    return NextResponse.json(projectsFormatted);
  } catch (error: any) {
    console.error('Erro ao buscar projetos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar projetos' },
      { status: 500 }
    );
  }
}

// POST - Salvar novo projeto
export async function POST(req: Request) {
  
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (userError) console.log('User error:', userError);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await req.json();

    const { name, originalImage, stencilImage, style, widthCm, heightCm, promptDetails } = body;

    if (!name || !originalImage || !stencilImage) {
      return NextResponse.json(
        { error: 'Nome, imagem original e estêncil são obrigatórios' },
        { status: 400 }
      );
    }

    // Garantir que bucket existe (cria se necessário)
    await ensureBucketExists();

    // Gerar UUID para o projeto
    const projectId = uuidv4();

    // Upload das imagens para o Storage
    const originalImageResult = await uploadImage(
      originalImage,
      user.id,
      projectId,
      'original'
    );

    const stencilImageResult = await uploadImage(
      stencilImage,
      user.id,
      projectId,
      'stencil'
    );

    // Salvar projeto no banco (URLs do Storage)
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        id: projectId, // Usar o mesmo UUID gerado
        user_id: user.id,
        name,
        // Salvar URLs do Storage nas colunas existentes
        original_image: originalImageResult.publicUrl,
        stencil_image: stencilImageResult.publicUrl,
        style: style || 'standard',
        width_cm: Math.round(widthCm) || null,
        height_cm: Math.round(heightCm) || null,
        prompt_details: promptDetails,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidar cache de projetos do usuário
    await invalidateCache(userId, 'projects');

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Erro ao salvar projeto:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar projeto: ' + error.message },
      { status: 500 }
    );
  }
}
