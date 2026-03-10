/**
 * POST /api/r2/presign
 *
 * Generate a short-lived presigned URL (1h) for a private R2 object.
 * Validates that the requesting user owns the object (key prefix check).
 *
 * Body (JSON):
 *   key — R2 object key (e.g. "users/clerk_xxx/projectId/stencil.png")
 *   ttl — URL lifetime in seconds (default 3600, max 86400)
 */
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl, userPrefix } from '@/lib/r2';
import { logger } from '@/lib/logger';

const MAX_TTL = 86400; // 24h hard cap

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { key, ttl = 3600 } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    // Security: ensure the key belongs to this user
    const expectedPrefix = userPrefix(clerkId);
    if (!key.startsWith(expectedPrefix + '/')) {
      return NextResponse.json(
        { error: 'Access denied — key does not belong to your account' },
        { status: 403 }
      );
    }

    const ttlSeconds = Math.min(Math.max(parseInt(String(ttl)), 60), MAX_TTL);
    const url = await getPresignedUrl(key, ttlSeconds);

    return NextResponse.json({ url, expiresIn: ttlSeconds });
  } catch (error: any) {
    logger.error('[R2 Presign] Erro ao gerar URL', { error });
    return NextResponse.json({ error: error.message ?? 'Failed to generate URL' }, { status: 500 });
  }
}
