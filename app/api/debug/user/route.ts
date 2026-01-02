import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin as checkIsAdmin } from '@/lib/auth';

import { supabaseAdmin } from '@/lib/supabase';

/**
 * DEBUG ENDPOINT - Verificar estado do usuário
 * GET /api/debug/user
 *
 * 🔒 SEGURANÇA: Apenas disponível em desenvolvimento
 */
export async function GET() {
  // 🔒 SEGURANÇA: Bloquear em produção
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'Endpoint de debug não disponível em produção'
    }, { status: 403 });
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({
        error: 'Não autenticado no Clerk',
        clerkUserId: null
      }, { status: 401 });
    }

    // Buscar usuário no Supabase (sem is_admin pois não existe)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, clerk_id, is_paid, plan, subscription_status')
      .eq('clerk_id', userId)
      .single();

    // Verificar admin usando config centralizada
    const { isAdminEmail, ADMIN_EMAILS } = await import('@/lib/admin-config');
    
    const isAdminByEmail = isAdminEmail(user?.email || '');
    const hasAdminAccess = user && isAdminByEmail;

    return NextResponse.json({
      clerkUserId: userId,
      supabaseUser: user || null,
      supabaseError: error?.message || null,
      adminCheck: {
        userEmail: user?.email,
        userEmailLower: user?.email?.toLowerCase() || '',
        isAdminByEmail,
        hasAdminAccess,
        adminEmails: ADMIN_EMAILS,
      },
      recommendation: !user 
        ? 'Usuário NÃO existe no Supabase. Faça logout e login novamente para criar.'
        : !hasAdminAccess 
          ? `Email ${user?.email} não está na lista de admins`
          : 'Tudo OK! Deveria ter acesso admin.'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
