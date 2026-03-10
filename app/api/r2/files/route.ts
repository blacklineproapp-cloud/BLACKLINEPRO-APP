/**
 * GET /api/r2/files
 *
 * List all files for the authenticated user.
 * Source 'r2' lists raw R2 objects, 'db' lists from projects table.
 *
 * Query params:
 *   source — 'db' | 'r2' (default 'db')
 *   limit  — max results (default 50)
 *   offset — pagination offset (default 0)
 */
import { NextRequest, NextResponse } from 'next/server';
import { listUserObjects, userPrefix } from '@/lib/r2';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

export const GET = withAuth(async (req: NextRequest, { userId, user }) => {
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50'),  100);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'),  0);
  const source = searchParams.get('source') ?? 'db';

  if (source === 'r2') {
    const prefix  = userPrefix(userId);
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

  // DB list from projects table
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, name, original_image_key, stencil_image_key, thumbnail_key, style, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return NextResponse.json({
    files: data,
    limit,
    offset,
  });
});
