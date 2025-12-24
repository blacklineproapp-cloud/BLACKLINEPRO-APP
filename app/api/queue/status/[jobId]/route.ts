import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getJobStatus } from '@/lib/queue';

/**
 * API para verificar status de um job
 * GET /api/queue/status/[jobId]?queue=stencil-generation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { jobId } = params;
    const searchParams = request.nextUrl.searchParams;
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
