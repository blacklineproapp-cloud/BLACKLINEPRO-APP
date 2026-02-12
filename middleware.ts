import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, NextRequest } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { ADMIN_EMAILS } from "./lib/admin-config";
import { maskEmail } from "./lib/logger";

// Criar middleware next-intl
const handleI18nRouting = createMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  '/',
  '/:locale',
  '/pricing(.*)',
  '/:locale/pricing(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/:locale/sign-in(.*)',
  '/:locale/sign-up(.*)',
  '/api/stats',
  '/api/webhooks/clerk',
  '/api/webhooks/asaas',
  '/manifest.json',
]);

// Rotas que requerem permissão de admin
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/:locale/admin(.*)',
  '/api/admin/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Detectar se é uma rota de API
  const isApiRequest = request.nextUrl.pathname.startsWith('/api');

  // Executar middleware next-intl apenas para rotas que NÃO são de API
  // Isso evita que o next-intl intercepte APIs e retorne 404 ou redirects
  const response = isApiRequest ? NextResponse.next() : await handleI18nRouting(request);
  
  // Se next-intl retornou redirect (307/308) em uma página, retornar imediatamente
  if (!isApiRequest && (response.status === 307 || response.status === 308)) {
    return response;
  }

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

      // Lista de origens permitidas (Otimizado para Produção)
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL,
        'https://www.stencilflow.com.br',
        'https://stencilflow.com.br',
        'https://stencilflow-nextjs.vercel.app', // Vercel preview/prod
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        'http://localhost:3000',
        'https://localhost:3000'
      ].filter(Boolean).map(url => url!.replace(/\/$/, '')) as string[];

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

      // ✅ CORREÇÃO SEGURANÇA: Comparação exata para evitar bypass
      const isAllowedOrigin = allowedOrigins.some(allowed =>
        requestOrigin === allowed || requestOrigin === allowed + '/'
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
    const { userId } = await auth();
    
    // Não autenticado = bloquear
    if (!userId) {
      if (isApiRequest) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Buscar dados completos do usuário via Clerk API
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;
    const role = user.publicMetadata?.role as string | undefined;

    const isAdminRole = role === 'admin' || role === 'superadmin';
    const isEmailAdmin = userEmail && ADMIN_EMAILS.some(
      e => e.toLowerCase() === userEmail.toLowerCase()
    );

    if (!isAdminRole && !isEmailAdmin) {
      console.log('[Middleware] ⛔ Acesso admin negado:', { userId, email: maskEmail(userEmail), role });
      
      // API retorna JSON, páginas fazem redirect
      if (isApiRequest) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    console.log('[Middleware] ✅ Admin autorizado:', maskEmail(userEmail));
  }

  // Rotas públicas não precisam de auth
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Retornar response do next-intl
  return response;
});

export const config = {
  matcher: [
    // Incluir todas as rotas exceto:
    // - Next.js internals (_next, _vercel)
    // - Arquivos estáticos (.*\\..*) 
    // - Webhooks (já têm validação própria)
    '/((?!_next|_vercel|.*\\..*|api/webhooks).*)',
    
    // Sempre rodar em rotas de API (exceto webhooks)
    '/api/((?!webhooks).*)'
  ],
};

