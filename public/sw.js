/**
 * Service Worker do StencilFlow PWA
 * Estratégia: Network-first com fallback para cache
 */

const CACHE_NAME = 'stencilflow-v2-fast';
const OFFLINE_URL = '/offline.html';

// ⚡ OTIMIZAÇÃO CRÍTICA: Cachear APENAS o mínimo no install
// Assets pesados são cacheados sob demanda (lazy caching)
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install - Precache apenas essencial (super rápido!)
self.addEventListener('install', (event) => {
  console.log('[SW] 🚀 Instalando Service Worker OTIMIZADO...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] ⚡ Cacheando apenas assets críticos (rápido)');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] ⚠️ Erro no precache (continuando):', err);
      });
    })
    .then(() => {
      console.log('[SW] ✅ Install completo - pulando espera');
      return self.skipWaiting();
    })
  );
});

// Activate - Limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch - Estratégia OTIMIZADA: Cache-first para estáticos, Network-first para API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar Chrome extensions e DevTools
  if (url.protocol === 'chrome-extension:' || url.protocol === 'devtools:') {
    return;
  }

  // Ignorar APIs externas (Clerk, Stripe, Supabase)
  if (
    url.hostname.includes('clerk.') ||
    url.hostname.includes('stripe.') ||
    url.hostname.includes('supabase.') ||
    url.hostname.includes('clerk.accounts.dev')
  ) {
    return;
  }

  // Ignorar hot-reload do Next.js em dev
  if (url.pathname.includes('/_next/webpack-hmr') || url.pathname.includes('/__nextjs')) {
    return;
  }

  // ⚡ OTIMIZAÇÃO: Determinar estratégia baseada no tipo de recurso
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/) ||
    url.pathname === '/manifest.json';

  const isApiRoute = url.pathname.startsWith('/api/');

  // Estratégia de cache otimizada
  if (isStaticAsset) {
    // ⚡ CACHE-FIRST para assets estáticos (JS, CSS, imagens, fontes)
    event.respondWith(
      cacheFirst(request)
        .catch(() => networkFirst(request, 2000)) // 2s timeout
        .catch(() => offlineFallback(request))
    );
  } else if (isApiRoute) {
    // 🌐 NETWORK-ONLY para API (sempre dados frescos)
    event.respondWith(
      fetch(request).catch(() => offlineFallback(request))
    );
  } else {
    // 🌐 NETWORK-FIRST para páginas HTML (com timeout curto)
    event.respondWith(
      networkFirst(request, 2000) // 2s timeout (antes era 5s!)
        .catch(() => cacheFirst(request))
        .catch(() => offlineFallback(request))
    );
  }
});

// Network-first: Tenta rede com timeout configurável
async function networkFirst(request, timeout = 2000) {
  try {
    const response = await fetch(request, {
      signal: AbortSignal.timeout(timeout), // Timeout configurável (padrão 2s)
    });

    // Se resposta OK, cachear para uso futuro (lazy caching!)
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      // Clone assíncrono para não bloquear resposta
      cache.put(request, response.clone()).catch(err =>
        console.warn('[SW] ⚠️ Erro ao cachear:', err)
      );
    }

    return response;
  } catch (error) {
    console.log('[SW] ⚡ Network timeout/failed, usando cache:', request.url);
    throw error;
  }
}

// Cache-first: Buscar do cache
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW] Servindo do cache:', request.url);
    return cached;
  }
  throw new Error('Not in cache');
}

// Offline fallback
async function offlineFallback(request) {
  const url = new URL(request.url);

  // Para navegação, mostrar página offline
  if (request.mode === 'navigate') {
    const offlineCache = await caches.match(OFFLINE_URL);
    if (offlineCache) {
      return offlineCache;
    }

    // Fallback genérico se não houver página offline
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - StencilFlow</title>
          <style>
            body {
              background: #000;
              color: #fff;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              text-align: center;
              padding: 20px;
            }
            .container {
              max-width: 400px;
            }
            h1 {
              color: #10b981;
              margin-bottom: 16px;
            }
            p {
              color: #a1a1aa;
              line-height: 1.6;
            }
            button {
              background: #10b981;
              color: #000;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              margin-top: 24px;
            }
            button:hover {
              background: #059669;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Sem Conexão</h1>
            <p>Você está offline. Algumas funcionalidades podem estar limitadas.</p>
            <p>Conecte-se à internet para acessar todos os recursos do StencilFlow.</p>
            <button onclick="location.reload()">Tentar Novamente</button>
          </div>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  // Para outros requests, retornar erro
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

// Mensagens do cliente (para comunicação com app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Pulando espera e ativando imediatamente');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => caches.delete(cacheName));
    });
    event.ports[0].postMessage({ cleared: true });
  }
});

console.log('[SW] Service Worker carregado:', CACHE_NAME);
