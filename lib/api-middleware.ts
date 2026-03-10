import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, isSuperAdmin, getOrCreateUser } from './auth';
import { supabaseAdmin } from './supabase';
import { logger } from './logger';
import * as Sentry from '@sentry/nextjs';

/**
 * API Middleware — Centraliza auth, error handling e logging para rotas
 *
 * Uso:
 *   export const GET = withAdminAuth(async (req, { userId, adminId }) => {
 *     // Já autenticado como admin
 *     return NextResponse.json({ data: ... });
 *   });
 *
 *   export const POST = withAuth(async (req, { userId, user }) => {
 *     // Já autenticado como usuário
 *     return NextResponse.json({ data: ... });
 *   });
 */

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface AuthContext {
  userId: string;       // Clerk user ID
  user: Record<string, any>;  // Supabase user record
}

export interface AdminContext extends AuthContext {
  adminId: string;      // Supabase UUID do admin
  adminEmail: string;
}

type AuthHandler = (req: NextRequest, ctx: AuthContext, ...args: any[]) => Promise<NextResponse>;
type AdminHandler = (req: NextRequest, ctx: AdminContext, ...args: any[]) => Promise<NextResponse>;
type SuperAdminHandler = (req: NextRequest, ctx: AdminContext, ...args: any[]) => Promise<NextResponse>;

// ============================================================================
// ERROR HANDLING
// ============================================================================

function handleError(error: unknown, context: string): NextResponse {
  const err = error instanceof Error ? error : new Error(String(error));

  logger.error(`[${context}]`, err.message);
  Sentry.captureException(err, { tags: { context } });

  const status = (err as Error & { status?: number }).status || 500;
  const message = status === 500
    ? 'Erro interno do servidor'
    : err.message;

  return NextResponse.json({ error: message }, { status });
}

// ============================================================================
// withAuth — Requer autenticação (qualquer usuário logado)
// ============================================================================

export function withAuth(handler: AuthHandler) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    try {
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        );
      }

      const user = await getOrCreateUser(userId);

      if (!user) {
        return NextResponse.json(
          { error: 'Erro ao buscar usuário' },
          { status: 500 }
        );
      }

      return await handler(req, { userId, user }, ...args);
    } catch (error) {
      return handleError(error, 'withAuth');
    }
  };
}

// ============================================================================
// withAdminAuth — Requer autenticação + admin role
// ============================================================================

export function withAdminAuth(handler: AdminHandler) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    try {
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        );
      }

      const adminCheck = await isAdmin(userId);

      if (!adminCheck) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        );
      }

      // Buscar dados do admin no Supabase
      const { data: adminUser } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('clerk_id', userId)
        .single();

      if (!adminUser) {
        return NextResponse.json(
          { error: 'Admin não encontrado' },
          { status: 403 }
        );
      }

      return await handler(req, {
        userId,
        user: adminUser,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
      }, ...args);
    } catch (error) {
      return handleError(error, 'withAdminAuth');
    }
  };
}

// ============================================================================
// withSuperAdminAuth — Requer superadmin role
// ============================================================================

export function withSuperAdminAuth(handler: SuperAdminHandler) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    try {
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        );
      }

      const superAdminCheck = await isSuperAdmin(userId);

      if (!superAdminCheck) {
        return NextResponse.json(
          { error: 'Acesso negado. Requer superadmin.' },
          { status: 403 }
        );
      }

      const { data: adminUser } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('clerk_id', userId)
        .single();

      if (!adminUser) {
        return NextResponse.json(
          { error: 'Superadmin não encontrado' },
          { status: 403 }
        );
      }

      return await handler(req, {
        userId,
        user: adminUser,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
      }, ...args);
    } catch (error) {
      return handleError(error, 'withSuperAdminAuth');
    }
  };
}
