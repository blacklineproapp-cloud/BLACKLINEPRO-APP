import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth';

export const revalidate = 300; // Revalidar a cada 5 minutos (cache)

/**
 * Estatísticas do sistema
 * RESTRITO: Apenas admins podem acessar
 */
export async function GET() {
  try {
    // 📊 Estatísticas públicas para a Landing Page
    // Não requer auth para que visitantes vejam os números de marketing
    
    // Total de usuários cadastrados
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Total de projetos criados
    const { count: totalProjects } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true });

    // Usuários pagantes (conversão)
    const { count: paidUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_paid', true);

    // Taxa de conversão
    const conversionRate = totalUsers && totalUsers > 0
      ? ((paidUsers || 0) / totalUsers * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalProjects: totalProjects || 0,
      paidUsers: paidUsers || 0,
      conversionRate: parseFloat(conversionRate),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    // Retornar valores default em caso de erro
    return NextResponse.json({
      totalUsers: 0,
      totalProjects: 0,
      paidUsers: 0,
      conversionRate: 0,
    });
  }
}
