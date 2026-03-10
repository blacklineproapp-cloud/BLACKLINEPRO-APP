/**
 * GET /api/r2/files
 *
 * List all generated images for the authenticated user.
 * Returns R2 object metadata (key, size, date) — NOT presigned URLs.
 * Use /api/r2/presign to get a URL for a specific key.
 *
 * Query params:
 *   limit  — max results (default 50)
 *   offset — pagination offset (default 0)
 */
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { listUserImages } from '@/lib/db';
import { listUserObjects, userPrefix } from '@/lib/r2';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50'),  100);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'),  0);
    const source = searchParams.get('source') ?? 'db'; // 'db' | 'r2'

    if (source === 'r2') {
      // Raw R2 list (no DB) — useful for storage management view
      const prefix  = userPrefix(clerkId);
      const objects = await listUserObjects(prefix);

      return NextResponse.json({
        files: objects.map(o => ({
          key:          o.key,
          size:         o.size,
          lastModified: o.lastModified,
        })),
        total: objects.length,
      });
    }

    // DB list — richer metadata (style, prompt, etc.)
    const images = await listUserImages(clerkId, limit, offset);

    return NextResponse.json({
      files: images,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error('[R2 Files] Erro ao listar arquivos', { error });
    return NextResponse.json({ error: error.message ?? 'Failed to list files' }, { status: 500 });
  }
}
