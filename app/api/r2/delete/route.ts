/**
 * DELETE /api/r2/delete
 *
 * Delete one or more R2 objects belonging to the authenticated user.
 * Validates ownership via key prefix before deletion.
 *
 * Body (JSON):
 *   keys — string[] — list of R2 keys to delete
 */
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { deleteObject, deleteAllUserObjects, userPrefix } from '@/lib/r2';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { keys, deleteAll = false } = body;

    const prefix = userPrefix(clerkId);

    if (deleteAll) {
      // Nuclear option: delete everything for this user (account deletion flow)
      await deleteAllUserObjects(prefix);
      await sql`DELETE FROM generated_images WHERE user_id = (
        SELECT id FROM users WHERE clerk_id = ${clerkId}
      )`;
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

    // Delete from R2
    await Promise.all(keys.map((k: string) => deleteObject(k)));

    // Remove DB records
    await sql`
      DELETE FROM generated_images
      WHERE r2_key = ANY(${keys})
        AND user_id = (SELECT id FROM users WHERE clerk_id = ${clerkId})
    `;

    return NextResponse.json({ deleted: keys.length });
  } catch (error: any) {
    logger.error('[R2 Delete] Erro ao deletar', { error });
    return NextResponse.json({ error: error.message ?? 'Delete failed' }, { status: 500 });
  }
}
