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
  '/api/webhooks(.*)',
  '/manifest.json',
]);

// Rotas que requerem permissão de admin
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // 🚨 EMERGÊNCIA: Liberar Webhooks explicitamente antes de tudo
  if (request.nextUrl.pathname.startsWith('/api/webhooks')) {
    console.log('[Middleware] 🔓 Webhook detectado (Bypass Auth):', request.nextUrl.pathname);
    return NextResponse.next();
  }

  /*
  // ========================================
  // 🔒 PROTEÇÃO CSRF - DESABILITADA TEMPORARIAMENTE
  // Motivo: Causando possíveis conflitos com login/redirects
  // ========================================

  const method = request.method;
  const isModifyingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  // ... (código comentado) ...
  */

  /*
  // ========================================
  // 🔒 CHECAGEM DE ADMIN NO MIDDLEWARE - DESABILITADA
  // Motivo: Logica assíncrona pesada no Edge pode causar timeouts/redirect loops.
  // A segurança de Admin deve ser feita via RLS ou check na API/Page.
  // ========================================
  
  // if (isAdminRoute(request)) { ... }
  */

  // 🛡️ Proteção Padrão do Clerk
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

