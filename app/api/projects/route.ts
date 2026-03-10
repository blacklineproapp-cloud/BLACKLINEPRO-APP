import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  uploadImage,
  uploadImageWithThumbnail,
  getPresignedUrl,
  userPrefix,
} from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';
import { getOrSetCache, invalidateCache } from '@/lib/cache';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

// GET - Listar projetos do usuário
export const GET = withAuth(async (req, { userId, user }) => {
  const projectsFormatted = await getOrSetCache(
    userId,
    async () => {
      const { data: projects, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Gerar presigned URLs frescas para projetos com R2 keys
      const projectsWithUrls = await Promise.all(
        (projects || []).map(async (project) => {
          let originalUrl = project.original_image;
          let stencilUrl = project.stencil_image;
          let thumbnailUrl = project.thumbnail_url;

          if (project.original_image_key) {
            try { originalUrl = await getPresignedUrl(project.original_image_key); } catch {}
          }
          if (project.stencil_image_key) {
            try { stencilUrl = await getPresignedUrl(project.stencil_image_key); } catch {}
          }
          if (project.thumbnail_key) {
            try { thumbnailUrl = await getPresignedUrl(project.thumbnail_key); } catch {}
          }

          return {
            ...project,
            original_image: originalUrl,
            stencil_image: stencilUrl,
            thumbnail_url: thumbnailUrl,
          };
        })
      );

      return projectsWithUrls;
    },
    {
      ttl: 3300000, // 55 min — presigned URLs expiram em 1h
      tags: [`user:${userId}`, 'projects'],
      namespace: 'projects',
    }
  );

  return NextResponse.json(projectsFormatted);
});

// POST - Salvar novo projeto
export const POST = withAuth(async (req, { userId, user }) => {
  const body = await req.json();
  const { name, originalImage, stencilImage, style, widthCm, heightCm, promptDetails } = body;

  if (!name || !originalImage || !stencilImage) {
    return NextResponse.json(
      { error: 'Nome, imagem original e estêncil são obrigatórios' },
      { status: 400 }
    );
  }

  const projectId = uuidv4();
  const prefix = userPrefix(userId);

  // Upload paralelo no R2: original + stencil com thumbnail
  const [originalResult, stencilResult] = await Promise.all([
    uploadImage(originalImage, prefix, projectId, 'original'),
    uploadImageWithThumbnail(stencilImage, prefix, projectId, 'stencil'),
  ]);

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert({
      id: projectId,
      user_id: user.id,
      name,
      original_image: originalResult.presignedUrl,
      stencil_image: stencilResult.presignedUrl,
      thumbnail_url: stencilResult.thumbnailPresignedUrl,
      original_image_key: originalResult.key,
      stencil_image_key: stencilResult.key,
      thumbnail_key: stencilResult.thumbnailKey,
      style: style || 'standard',
      width_cm: Math.round(widthCm) || null,
      height_cm: Math.round(heightCm) || null,
      prompt_details: promptDetails,
    })
    .select()
    .single();

  if (error) throw error;

  await invalidateCache(userId, 'projects');

  return NextResponse.json(project);
});
