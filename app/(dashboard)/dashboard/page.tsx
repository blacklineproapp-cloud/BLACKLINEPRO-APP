import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  const user = await getOrCreateUser(userId);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-white">Erro ao carregar. Tente fazer logout e login novamente.</p>
      </div>
    );
  }

  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, name, original_image, stencil_image, created_at, style, width_cm, height_cm')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50); // Limitar a 50 projetos mais recentes

  // Buscar imagens IA Gen (mesmo padrão dos projetos)
  const { data: aiGenImages } = await supabaseAdmin
    .from('ai_usage')
    .select('id, created_at, metadata')
    .eq('user_id', user.id)
    .eq('operation_type', 'generate_idea')
    .order('created_at', { ascending: false })
    .limit(50); // Limitar a 50 imagens mais recentes

  const isSubscribed = user.is_paid && user.subscription_status === 'active';

  // Buscar uso do mês atual
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: usageData } = await supabaseAdmin
    .from('ai_usage')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', firstDayOfMonth.toISOString());

  const currentUsage = usageData?.length || 0;

  // Determinar limite baseado no plano
  const limits: Record<string, number | null> = {
    'starter': 100,
    'pro': 500,
    'studio': null // ilimitado
  };
  const monthlyLimit = limits[user.plan as string] || 100;

  // Verificar se usuário tem cortesia com deadline
  const courtesyDeadline = (user as any).courtesy_deadline;
  const assignedPlan = (user as any).assigned_plan;

  return (
    <DashboardClient
      projects={projects || []}
      aiGenImages={aiGenImages || []} // 🆕 Passar imagens IA Gen
      isSubscribed={isSubscribed}
      currentUsage={currentUsage}
      monthlyLimit={monthlyLimit}
      userPlan={user.plan}
      courtesyDeadline={courtesyDeadline}
      assignedPlan={assignedPlan}
      userId={user.clerk_id}
      userEmail={user.email}
      isPaid={user.is_paid}
    />
  );
}
