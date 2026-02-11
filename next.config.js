const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');

// Criar plugin next-intl com caminho para request config
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚡ OTIMIZAÇÕES DE PERFORMANCE
  compress: true, // Compressão gzip automática
  poweredByHeader: false, // Remover header desnecessário

  // External packages for server components
  serverExternalPackages: ['bullmq'], // BullMQ tem dependências dinâmicas

  // Experimental features para performance
  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree-shaking agressivo
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
    // Otimizar imagens
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Headers PWA + Segurança
  async headers() {
    return [
      // 🔒 SECURITY HEADERS - Aplicar a todas as rotas
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // CSP - Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.stencilflow.com.br https://*.clerk.accounts.dev https://challenges.cloudflare.com https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://clerk.stencilflow.com.br https://*.clerk.accounts.dev https://generativelanguage.googleapis.com https://www.facebook.com https://connect.facebook.net https://www.google-analytics.com https://*.ingest.us.sentry.io https://capig.madgicx.ai",
              "frame-src 'self' https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
        ],
      },
      // Manifest
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate', // 1 hora + revalidação
          },
        ],
      },
      // Service Worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // Offline page
      {
        source: '/offline.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      // Static assets
      {
        source: '/:path*.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate', // 1 hora + revalidação (Era immutable 1 ano)
          },
        ],
      },
    ];
  },
};

// Sentry configuration - Habilitado para source maps em produção
const sentryWebpackPluginOptions = {
  silent: true,
  sourcemaps: {
    disable: false, // ✅ Habilitado para stack traces legíveis
  },
  release: {
    create: true,
    finalize: true,
  },
};

// Build com next-intl + Sentry plugins
module.exports = withSentryConfig(
  withNextIntl(nextConfig),
  sentryWebpackPluginOptions
);
