import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Capturar erro manualmente
    Sentry.captureException(new Error('🧪 Teste Server-Side - Sentry funcionando!'));
    
    // Também gerar um erro real
    throw new Error('🔥 Erro Server-Side para Sentry');
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ 
      success: true, 
      message: 'Erro enviado ao Sentry! Verifique o dashboard.' 
    });
  }
}
