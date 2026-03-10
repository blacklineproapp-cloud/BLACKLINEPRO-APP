export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { isAdmin } from '@/lib/auth';
// GET - Retorna status do usuário (assinatura, tools, etc)
export const GET = withAuth(async (req, { userId, user }) => {
  // ✅ Verificar se é admin (Clerk metadata ou lista de emails)
  const userIsAdmin = await isAdmin();

  // BYOK: gerações ilimitadas para todos os planos
  const toolsUnlocked = user.tools_unlocked || userIsAdmin;

  const isSubscribed = !!(user.is_paid && user.subscription_status === 'active');

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    isAdmin: userIsAdmin,
    isSubscribed,
    plan: user.plan,
    showAds: !isSubscribed && !userIsAdmin,
    subscriptionStatus: user.subscription_status,
    subscriptionExpiresAt: user.subscription_expires_at,
    toolsUnlocked,
    trialRemaining: true, // BYOK: sempre disponível
    createdAt: user.created_at,
  });
});
