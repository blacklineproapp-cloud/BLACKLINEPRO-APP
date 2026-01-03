import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getAbuseStats, blockIP, unblockIP } from '@/lib/abuse-prevention';

/**
 * API Admin: Gerenciamento de Abuso por IP
 * 
 * GET /api/admin/ip-abuse - Estatísticas gerais
 * POST /api/admin/ip-abuse - Bloquear/desbloquear IP
 */

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const stats = await getAbuseStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Admin IP Abuse] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { action, ipAddress, reason } = body;

    // Validação
    if (!action || !ipAddress) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: action, ipAddress' },
        { status: 400 }
      );
    }

    if (!['block', 'unblock'].includes(action)) {
      return NextResponse.json(
        { error: 'Action deve ser "block" ou "unblock"' },
        { status: 400 }
      );
    }

    // Validar formato de IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^historical$/;
    if (!ipRegex.test(ipAddress)) {
      return NextResponse.json(
        { error: 'Formato de IP inválido' },
        { status: 400 }
      );
    }

    // Executar ação
    if (action === 'block') {
      if (!reason) {
        return NextResponse.json(
          { error: 'Motivo do bloqueio é obrigatório' },
          { status: 400 }
        );
      }
      await blockIP(ipAddress, reason);
    } else {
      await unblockIP(ipAddress);
    }

    return NextResponse.json({
      success: true,
      action,
      ipAddress,
      message: action === 'block' 
        ? `IP ${ipAddress} bloqueado com sucesso`
        : `IP ${ipAddress} desbloqueado com sucesso`,
    });
  } catch (error: any) {
    console.error('[Admin IP Abuse] Erro na ação:', error);
    return NextResponse.json(
      { error: 'Erro ao executar ação', details: error.message },
      { status: 500 }
    );
  }
}
