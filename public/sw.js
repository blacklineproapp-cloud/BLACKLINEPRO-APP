/**
 * Service Worker do Black Line Pro PWA
 * Estratégia: Network-first com fallback para cache
 */

// ⚡ VERSÃO DO CACHE - Mudar a cada deploy para forçar atualização!
const CACHE_VERSION = '5.2.3'; // Incrementar a cada deploy
const CACHE_NAME = `blacklinepro-v${CACHE_VERSION}`;
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
  console.log('[SW] 🚀 Instalando Service Worker OTIMIZADO...', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] ⚡ Cacheando apenas assets críticos (rápido)');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] ⚠️ Erro no precache (continuando):', err);
      });
    })
    .then(() => {
      console.log('[SW] ✅ Install completo - ativando imediatamente');
      // ⚡ CORREÇÃO CRÍTICA: skipWaiting() permite atualização suave
      // Sem forçar usuário a reinstalar o app
      return self.skipWaiting();
    })
  );
});

// Activate - Limpar caches antigos e assumir controle
self.addEventListener('activate', (event) => {
  console.log('[SW] 🔄 Ativando nova versão:', CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] ✅ Ativado - assumindo controle de todas as páginas');
      // ⚡ CORREÇÃO CRÍTICA: claim() assume controle imediatamente
      // Permite atualização sem reload manual
      return self.clients.claim();
    })
    .then(() => {
      // Notificar todos os clientes que a atualização está completa
      // 🔧 CORREÇÃO: try-catch para WebViews (Instagram, Facebook) que podem ter clientes stale
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          try {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: CACHE_VERSION
            });
          } catch (err) {
            // Silenciar erro em WebViews onde cliente Java foi destruído
            console.warn('[SW] ⚠️ Cliente não disponível para postMessage (WebView)');
          }
        });
      });
    })
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
  
  // ⚡ ERRO CORRIGIDO: Não cachear páginas dinâmicas/autenticadas
  // Isso causava "Insufficient resources" e stale data
  const isDynamicPage = 
    url.pathname.startsWith('/dashboard') || 
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/sign-in') ||
    url.pathname.startsWith('/sign-up');

  // Estratégia de cache otimizada
  if (isStaticAsset) {
    // ⚡ CACHE-FIRST para assets estáticos (JS, CSS, imagens, fontes)
    // 🔧 OTIMIZAÇÃO: Aumentado timeout para imagens (10s) - conexões móveis instáveis
    const isImage = url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i);
    const timeout = isImage ? 10000 : 3000; // 10s para imagens, 3s para outros
    
    event.respondWith(
      cacheFirst(request)
        .catch(() => networkFirst(request, timeout))
        .catch(() => {
          // Para imagens, retornar placeholder silenciosamente
          if (isImage) {
            console.log('[SW] 🖼️ Imagem não carregou, retornando vazio:', request.url);
            return new Response('', { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
          }
          return offlineFallback(request);
        })
    );
  } else if (isApiRoute || isDynamicPage) {
    // 🌐 NETWORK-ONLY para API e Páginas Dinâmicas (sempre dados frescos, sem cache)
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
      signal: AbortSignal.timeout(timeout),
    });

    // Se resposta OK, cachear para uso futuro (com filtro de tamanho!)
    if (response && response.status === 200) {
      // ⚡ OTIMIZAÇÃO: Não cachear recursos muito grandes (evita AbortError)
      const contentLength = response.headers.get('content-length');
      const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB

      if (!contentLength || parseInt(contentLength) <= MAX_CACHE_SIZE) {
        try {
          const cache = await caches.open(CACHE_NAME);
          // Clone assíncrono para não bloquear resposta
          await cache.put(request, response.clone());
          console.log('[SW] ✅ Cacheado:', request.url);
        } catch (cacheError) {
          // Silenciar erro de cache (não é crítico)
          console.warn('[SW] ⚠️ Não foi possível cachear (ignorado):', request.url);
        }
      } else {
        console.log('[SW] ⏭️ Recurso muito grande, pulando cache:', request.url);
      }
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
          <title>Offline - Black Line Pro</title>
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
            <p>Conecte-se à internet para acessar todos os recursos do Black Line Pro.</p>
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
