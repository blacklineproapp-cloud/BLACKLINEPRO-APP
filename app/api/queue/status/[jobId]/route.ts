import { NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/queue';
import { withAuth } from '@/lib/api-middleware';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * API para verificar status de um job
 * GET /api/queue/status/[jobId]?queue=stencil-generation
 */
export const GET = withAuth(async (req, { userId, user }, context: RouteContext) => {
  const { jobId } = await context.params;
  const searchParams = new URL(req.url).searchParams;
  const queueName = searchParams.get('queue') as any;

  if (!queueName) {
    return NextResponse.json(
      { error: 'Parâmetro queue é obrigatório' },
      { status: 400 }
    );
  }

  const status = await getJobStatus(queueName, jobId);

  return NextResponse.json({
    jobId,
    ...status,
  });
});
