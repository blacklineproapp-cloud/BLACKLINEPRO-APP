/**
 * POST /api/r2/upload
 *
 * Server-side upload to Cloudflare R2.
 * Only available to authenticated users (Clerk) on paid plans with cloud storage.
 * Anonymous users get local download only — no server upload.
 *
 * Body (JSON):
 *   base64Image  — "data:image/png;base64,..." or raw base64
 *   projectId    — UUID for this generation
 *   type         — "original" | "stencil"
 *   withThumbnail — boolean (default true)
 */
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, uploadImageWithThumbnail, userPrefix } from '@/lib/r2';
import { saveGeneratedImage, getUserByClerkId } from '@/lib/db';
import { logger } from '@/lib/logger';

const STORAGE_PLANS = ['ink', 'pro', 'studio'];

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Authentication required for cloud storage' },
        { status: 401 }
      );
    }

    // Plan check — only storage-tier plans
    const user = await getUserByClerkId(clerkId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!STORAGE_PLANS.includes(user.plan)) {
      return NextResponse.json(
        { error: 'Cloud storage requires Studio plan or higher', plan: user.plan },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { base64Image, projectId, type = 'stencil', withThumbnail = true, style = 'standard', prompt } = body;

    if (!base64Image || !projectId) {
      return NextResponse.json(
        { error: 'base64Image and projectId are required' },
        { status: 400 }
      );
    }

    const prefix = userPrefix(clerkId);

    let result;
    if (withThumbnail) {
      result = await uploadImageWithThumbnail(base64Image, prefix, projectId, type);
    } else {
      const upload = await uploadImage(base64Image, prefix, projectId, type);
      result = { ...upload, thumbnailKey: undefined, thumbnailPresignedUrl: undefined };
    }

    // Save record to database
    await saveGeneratedImage({
      user_id:       user.id,
      r2_key:        result.key,
      thumbnail_key: 'thumbnailKey' in result ? result.thumbnailKey : undefined,
      style,
      prompt,
      projectId,
    } as any);

    return NextResponse.json({
      key:          result.key,
      url:          result.presignedUrl,
      thumbnailUrl: 'thumbnailPresignedUrl' in result ? result.thumbnailPresignedUrl : undefined,
    });
  } catch (error: any) {
    logger.error('[R2 Upload] Erro no upload', { error });
    return NextResponse.json(
      { error: error.message ?? 'Upload failed' },
      { status: 500 }
    );
  }
}
