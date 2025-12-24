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

  const isSubscribed = user.is_paid && user.subscription_status === 'active';

  return <DashboardClient projects={projects || []} isSubscribed={isSubscribed} />;
}
