'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleUnsubscribe = async () => {
    if (!email) return;
    
    setStatus('loading');
    
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Cancelar Emails de Marketing
          </h1>
          <p className="text-sm text-zinc-500">Black Line Pro</p>
        </div>
        
        {status === 'idle' && (
          <>
            <p className="text-zinc-400 mb-6">
              Tem certeza que deseja parar de receber emails de marketing do Black Line Pro?
            </p>
            {email && (
              <p className="text-sm text-zinc-500 mb-6 bg-zinc-800 rounded-lg p-3">
                Email: <strong className="text-white">{email}</strong>
              </p>
            )}
            <div className="space-y-3">
              <Button
                variant="destructive"
                onClick={handleUnsubscribe}
                className="w-full font-semibold py-3 px-6 rounded-lg"
              >
                Confirmar Cancelamento
              </Button>
              <Link
                href="/"
                className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-6 rounded-lg transition text-center"
              >
                Voltar ao Site
              </Link>
            </div>
          </>
        )}
        
        {status === 'loading' && (
          <div className="py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-zinc-400">Processando...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="py-4">
            <div className="text-indigo-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xl font-semibold mb-2">Cancelamento Confirmado</p>
              <p className="text-sm text-zinc-400">
                Você não receberá mais emails de marketing do Black Line Pro.
              </p>
            </div>
            <p className="text-xs text-zinc-500 mt-6">
              Você ainda receberá emails transacionais importantes (confirmações de pagamento, etc).
            </p>
            <Link
              href="/"
              className="mt-6 inline-block text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              Voltar ao Site →
            </Link>
          </div>
        )}
        
        {status === 'error' && (
          <div className="py-4">
            <div className="text-red-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="text-xl font-semibold mb-2">Erro ao Processar</p>
              <p className="text-sm text-zinc-400">
                Por favor, tente novamente ou entre em contato com o suporte.
              </p>
            </div>
            <Button
              variant="link"
              onClick={() => setStatus('idle')}
              className="mt-6 text-red-400 hover:text-red-300 text-sm font-medium"
            >
              ← Tentar Novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
