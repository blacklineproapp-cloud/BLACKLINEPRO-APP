import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;

    // Buscar últimas 50 atividades do usuário
    const { data: activities, error } = await supabaseAdmin
      .from('ai_usage')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Admin] Erro ao buscar atividades:', error);
      return NextResponse.json({ error: 'Erro ao buscar atividades' }, { status: 500 });
    }

    // Calcular estatísticas
    const stats = {
      total: activities?.length || 0,
      totalCost: activities?.reduce((sum, a) => sum + (Number(a.cost) || 0), 0) || 0,
      byType: {
        editor: activities?.filter(a => a.usage_type === 'editor_generation').length || 0,
        ai: activities?.filter(a => a.usage_type === 'ai_request').length || 0,
        tools: activities?.filter(a => a.usage_type === 'tool_usage').length || 0,
      }
    };

    return NextResponse.json({ activities: activities || [], stats });
  } catch (error: any) {
    console.error('[Admin] Erro ao buscar atividades do usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar atividades: ' + error.message },
      { status: 500 }
    );
  }
}
