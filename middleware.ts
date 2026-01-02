import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ADMIN_EMAILS } from "./lib/admin-config";

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/pricing/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/stats',
  '/api/webhooks/clerk',
  '/api/webhooks/clerk',
  '/api/webhooks/stripe',
  '/manifest.json',
]);

// Rotas que requerem permissão de admin
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // ========================================
  // 🔒 PROTEÇÃO CSRF - Validar Origin/Referer
  // ========================================

  const method = request.method;
  const isModifyingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  // Apenas validar em requisições que modificam dados
  if (isModifyingRequest) {
    // Ignorar webhooks (eles têm própria validação de assinatura)
    const isWebhook = request.nextUrl.pathname.startsWith('/api/webhooks/');

    if (!isWebhook) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');

      // Lista de origens permitidas
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        'http://localhost:3000', // Dev local
        'https://localhost:3000'
      ].filter(Boolean) as string[];

      // Validar Origin (preferência) ou Referer (fallback)
      const requestOrigin = origin || (referer ? new URL(referer).origin : null);

      if (!requestOrigin) {
        console.warn('[Middleware] ⚠️ CSRF: Request sem Origin/Referer', {
          path: request.nextUrl.pathname,
          method
        });
        return NextResponse.json({
          error: 'Requisição inválida: Origin ausente'
        }, { status: 403 });
      }

      const isAllowedOrigin = allowedOrigins.some(allowed =>
        requestOrigin.startsWith(allowed)
      );

      if (!isAllowedOrigin) {
        console.warn('[Middleware] 🚨 CSRF ATTACK DETECTADO!', {
          requestOrigin,
          allowedOrigins,
          path: request.nextUrl.pathname,
          method
        });
        return NextResponse.json({
          error: 'Origem não autorizada'
        }, { status: 403 });
      }

      console.log('[Middleware] ✅ CSRF validado:', { origin: requestOrigin });
    }
  }

  // Verificar rotas de admin PRIMEIRO
  if (isAdminRoute(request)) {
    const { userId, sessionClaims } = auth();
    
    // Não autenticado = bloquear
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar dados completos do usuário via Clerk API
    let userEmail: string | undefined;
    let role: string | undefined;
    
    try {
      const user = await clerkClient.users.getUser(userId);
      userEmail = user.emailAddresses[0]?.emailAddress;
      role = user.publicMetadata?.role as string | undefined;
    } catch (error) {
      console.error('[Middleware] Erro ao buscar usuário:', error);
    }

    const isAdminRole = role === 'admin' || role === 'superadmin';
    const isAdminEmail = userEmail && ADMIN_EMAILS.some(
      e => e.toLowerCase() === userEmail!.toLowerCase()
    );

    if (!isAdminRole && !isAdminEmail) {
      console.log('[Middleware] ⛔ Acesso admin negado:', { userId, email: userEmail, role });
      
      // API retorna JSON, páginas fazem redirect
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    console.log('[Middleware] ✅ Admin autorizado:', userEmail);
  }

  // Rotas públicas não precisam de auth
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

