import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getJobStatus } from '@/lib/queue';

/**
 * API para verificar status de um job
 * GET /api/queue/status/[jobId]?queue=stencil-generation
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { jobId } = await params;
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
  } catch (error: any) {
    console.error('Erro ao buscar status do job:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar status' },
      { status: 500 }
    );
  }
}
