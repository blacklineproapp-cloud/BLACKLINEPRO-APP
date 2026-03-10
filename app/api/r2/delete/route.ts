/**
 * DELETE /api/r2/delete
 *
 * Delete one or more R2 objects belonging to the authenticated user.
 * Validates ownership via key prefix before deletion.
 *
 * Body (JSON):
 *   keys — string[] — list of R2 keys to delete
 *   deleteAll — boolean — delete everything for this user
 */
import { NextRequest, NextResponse } from 'next/server';
import { deleteObject, deleteAllUserObjects, userPrefix } from '@/lib/r2';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

export const DELETE = withAuth(async (req: NextRequest, { userId, user }) => {
  const body = await req.json();
  const { keys, deleteAll = false } = body;

  const prefix = userPrefix(userId);

  if (deleteAll) {
    await deleteAllUserObjects(prefix);
    await supabaseAdmin
      .from('projects')
      .delete()
      .eq('user_id', user.id);
    return NextResponse.json({ deleted: 'all' });
  }

  if (!Array.isArray(keys) || !keys.length) {
    return NextResponse.json({ error: 'keys array is required' }, { status: 400 });
  }

  // Security: every key must belong to this user
  const unauthorized = keys.filter((k: string) => !k.startsWith(prefix + '/'));
  if (unauthorized.length) {
    return NextResponse.json(
      { error: 'Access denied — some keys do not belong to your account', unauthorized },
      { status: 403 }
    );
  }

  await Promise.all(keys.map((k: string) => deleteObject(k)));

  return NextResponse.json({ deleted: keys.length });
});
