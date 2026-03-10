/**
 * POST /api/r2/upload
 *
 * Server-side upload to Cloudflare R2.
 * Only available to authenticated users (Clerk) on paid plans with cloud storage.
 *
 * Body (JSON):
 *   base64Image  — "data:image/png;base64,..." or raw base64
 *   projectId    — UUID for this generation
 *   type         — "original" | "stencil"
 *   withThumbnail — boolean (default true)
 */
import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, uploadImageWithThumbnail, userPrefix } from '@/lib/r2';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

const STORAGE_PLANS = ['ink', 'pro', 'studio'];

export const POST = withAuth(async (req: NextRequest, { userId, user }) => {
  if (!STORAGE_PLANS.includes(user.plan)) {
    return NextResponse.json(
      { error: 'Cloud storage requires a paid plan', plan: user.plan },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { base64Image, projectId, type = 'stencil', withThumbnail = true } = body;

  if (!base64Image || !projectId) {
    return NextResponse.json(
      { error: 'base64Image and projectId are required' },
      { status: 400 }
    );
  }

  const prefix = userPrefix(userId);

  let result;
  if (withThumbnail) {
    result = await uploadImageWithThumbnail(base64Image, prefix, projectId, type);
  } else {
    const upload = await uploadImage(base64Image, prefix, projectId, type);
    result = { ...upload, thumbnailKey: undefined, thumbnailPresignedUrl: undefined };
  }

  return NextResponse.json({
    key:          result.key,
    url:          result.presignedUrl,
    thumbnailUrl: 'thumbnailPresignedUrl' in result ? result.thumbnailPresignedUrl : undefined,
  });
});
