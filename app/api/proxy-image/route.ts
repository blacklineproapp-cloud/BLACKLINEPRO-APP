import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/rate-limit';

// 🔒 SEGURANÇA: Whitelist de domínios permitidos
// Apenas imagens destes domínios podem ser proxied
const ALLOWED_DOMAINS = [
  'storage.googleapis.com',
  'img.clerk.com',
  'imagedelivery.net',
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
  'cdn.discordapp.com',
  'pbs.twimg.com',
  'graph.facebook.com',
  // Adicione outros domínios confiáveis conforme necessário
];

/**
 * Valida se a URL é de um domínio permitido
 */
function isAllowedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Valida se a URL parece ser uma imagem
 */
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || url.includes('image');
}

export async function POST(req: Request) {
  try {
    // 🔐 AUTENTICAÇÃO: Exigir usuário autenticado
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para usar este recurso.' },
        { status: 401 }
      );
    }

    // 🛡️ RATE LIMITING: Prevenir abuso
    const identifier = await getRateLimitIdentifier(userId);

    if (apiLimiter) {
      const { success, limit, remaining, reset } = await apiLimiter.limit(identifier);

      if (!success) {
        return NextResponse.json(
          {
            error: 'Muitas requisições',
            message: 'Você atingiu o limite de requisições. Tente novamente em alguns minutos.',
            limit,
            remaining,
            reset: new Date(reset).toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    }

    // 📥 VALIDAÇÃO: Verificar URL fornecida
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // 🔒 SEGURANÇA: Validar domínio permitido (proteção contra SSRF)
    if (!isAllowedDomain(url)) {
      return NextResponse.json(
        {
          error: 'Domínio não permitido',
          message: 'A URL fornecida não está na lista de domínios confiáveis.',
          allowedDomains: ALLOWED_DOMAINS,
        },
        { status: 403 }
      );
    }

    // 🖼️ VALIDAÇÃO: Verificar se parece ser uma imagem
    if (!isImageUrl(url)) {
      return NextResponse.json(
        { error: 'URL não parece ser uma imagem válida' },
        { status: 400 }
      );
    }

    // 🌐 FETCH: Buscar imagem do domínio permitido
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StencilFlow/2.0',
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // 📦 VALIDAÇÃO: Verificar content-type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'A URL não retornou uma imagem válida' },
        { status: 400 }
      );
    }

    // 📦 VALIDAÇÃO: Limitar tamanho (máximo 10MB)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Imagem muito grande. Máximo: 10MB' },
        { status: 413 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    // ✅ VALIDAÇÃO: Verificar tamanho real após download
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Imagem muito grande. Máximo: 10MB' },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ base64: dataUrl });
  } catch (error: any) {
    // ⏱️ Timeout error
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Timeout ao carregar imagem. Tente novamente.' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Erro ao carregar imagem' },
      { status: 500 }
    );
  }
}
