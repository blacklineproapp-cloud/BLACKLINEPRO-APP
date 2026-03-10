import { auth } from '@clerk/nextjs/server';
import { getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getPresignedUrl } from '@/lib/r2';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import DashboardClient from './DashboardClient';
import AnonymousDashboard from '@/components/AnonymousDashboard';

export default async function DashboardPage() {
  const tDashboard = await getTranslations('dashboard');
  const { userId } = await auth();

  if (!userId) {
    return <AnonymousDashboard />;
  }

  const user = await getOrCreateUser(userId);

  if (!user) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-white text-lg">{tDashboard('error.unavailable')}</p>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          {tDashboard('error.slowness')}
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition"
          >
            {tDashboard('error.tryAgain')}
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition"
          >
            {tDashboard('error.goHome')}
          </Link>
        </div>
        <p className="text-zinc-500 text-xs mt-4">
          {tDashboard('error.support')}
        </p>
      </div>
    );
  }

  // 🚀 PARALLEL DATA FETCHING (Performance MAXIMA)
  const [
    projectsResponse, 
    aiGenImagesResponse,
    usageResponse
  ] = await Promise.all([
    // 1. Meus Projetos (include _key fields for presigned URL regeneration)
    supabaseAdmin
      .from('projects')
      .select('id, name, original_image, stencil_image, original_image_key, stencil_image_key, created_at, style, width_cm, height_cm')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),

    // 2. Histórico IA
    supabaseAdmin
      .from('ai_usage')
      .select('id, created_at, metadata')
      .eq('user_id', user.id)
      .eq('operation_type', 'generate_idea')
      .order('created_at', { ascending: false })
      .limit(50),

    // 3. Uso do Mês
    supabaseAdmin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true }) // Count otimizado (head only)
      .eq('user_id', user.id)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);

  const rawProjects = projectsResponse.data || [];
  const aiGenImages = aiGenImagesResponse.data || [];
  const currentUsage = usageResponse.count || 0; // Usar count retornado do head: true

  // Regenerate presigned URLs for R2 projects (stored URLs expire after 1h)
  const projects = await Promise.all(
    rawProjects.map(async (project) => {
      let { original_image, stencil_image } = project;
      if (project.original_image_key) {
        try { original_image = await getPresignedUrl(project.original_image_key); } catch {}
      }
      if (project.stencil_image_key) {
        try { stencil_image = await getPresignedUrl(project.stencil_image_key); } catch {}
      }
      return { ...project, original_image, stencil_image };
    })
  );

  const isSubscribed = user.is_paid && user.subscription_status === 'active';

  // Determinar limite baseado no plano
  const limits: Record<string, number | null> = {
    'ink': 100,
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
