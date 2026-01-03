import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getIPDetails, searchAbuse } from '@/lib/abuse-prevention';

/**
 * API Admin: Detalhes e Busca de Abuso por IP
 * 
 * GET /api/admin/ip-abuse/details?ip=192.168.1.1 - Detalhes de um IP
 * GET /api/admin/ip-abuse/details?search=email@example.com - Buscar por email ou IP
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

    const { searchParams } = new URL(req.url);
    const ip = searchParams.get('ip');
    const searchQuery = searchParams.get('search');

    // Buscar detalhes de IP específico
    if (ip) {
      const details = await getIPDetails(ip);
      return NextResponse.json({
        success: true,
        details,
      });
    }

    // Buscar por query
    if (searchQuery) {
      const results = await searchAbuse(searchQuery);
      return NextResponse.json({
        success: true,
        results,
        query: searchQuery,
      });
    }

    return NextResponse.json(
      { error: 'Parâmetro obrigatório: ip ou search' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin IP Abuse Details] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes', details: error.message },
      { status: 500 }
    );
  }
}
