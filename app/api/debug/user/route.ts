import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * DEBUG ENDPOINT - Verificar estado do usuário
 * GET /api/debug/user
 */
export async function GET() {
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

    // Lista de emails admin
    const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];
    
    // Verificar admin apenas por email
    const userEmailLower = user?.email?.toLowerCase() || '';
    const isAdminByEmail = ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower);
    const hasAdminAccess = user && isAdminByEmail;

    return NextResponse.json({
      clerkUserId: userId,
      supabaseUser: user || null,
      supabaseError: error?.message || null,
      adminCheck: {
        userEmail: user?.email,
        userEmailLower,
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
