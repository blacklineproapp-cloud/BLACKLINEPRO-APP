import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';

    const { success } = await rateLimit(`byok-validate:${ip}`, 10, 3600);
    if (!success) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde antes de tentar novamente.' },
        { status: 429 }
      );
    }

    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'Chave não fornecida.' }, { status: 400 });
    }

    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
      return NextResponse.json(
        { error: 'Formato inválido. A chave deve começar com "AIza".' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      generationConfig: { maxOutputTokens: 1 },
    });

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    const message: string = error?.message ?? '';

    if (message.includes('API_KEY_INVALID') || message.includes('invalid') || message.includes('API key')) {
      return NextResponse.json(
        { error: 'Chave inválida. Verifique se copiou corretamente do Google AI Studio.' },
        { status: 400 }
      );
    }

    if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({ valid: true, warning: 'Cota do dia atingida, mas a chave é válida.' });
    }

    logger.warn('[byok/validate] Unexpected error, allowing key through', { message });
    return NextResponse.json({ valid: true });
  }
}
