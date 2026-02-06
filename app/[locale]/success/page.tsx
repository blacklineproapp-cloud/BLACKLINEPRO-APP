'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { useEffect } from 'react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams?.get('plan') as 'starter' | 'pro' | 'studio' | null;

  const planDetails = {
    starter: {
      name: 'Starter',
      price: 'R$ 50/mês',
      value: 50,
      icon: Zap,
      color: 'emerald',
      features: [
        'Editor de Stencil completo',
        'Modo Topográfico',
        'Modo Linhas Perfeitas',
        'Projetos ilimitados',
      ],
    },
    pro: {
      name: 'Pro',
      price: 'R$ 100/mês',
      value: 100,
      icon: Crown,
      color: 'purple',
      features: [
        'Tudo do plano Starter',
        'IA GEN (geração de imagens)',
        'Aprimorar imagem (4K)',
        'Color Match + Dividir A4',
      ],
    },
    studio: {
      name: 'Studio',
      price: 'R$ 300/mês',
      value: 300,
      icon: Sparkles,
      color: 'amber',
      features: [
        'Tudo do plano Pro',
        'Uso ilimitado',
        'Suporte prioritário',
        'Ideal para estúdios',
      ],
    },
    enterprise: {
      name: 'Enterprise',
      price: 'R$ 600/mês',
      value: 600,
      icon: Crown,
      color: 'blue',
      features: [
        'Tudo do plano Studio',
        'Uso ILIMITADO',
        'Suporte dedicado 24/7',
        'API + Onboarding',
      ],
    },
  };

  const details = plan ? (planDetails[plan] || null) : null;

  // Rastreamento Facebook Pixel + Auto-redirecionar
  useEffect(() => {
    // 1. Rastrear Conversão (Purchase)
    if (plan && planDetails[plan] && typeof window !== 'undefined' && (window as any).fbq) {
      const p = planDetails[plan];
      (window as any).fbq('track', 'Purchase', {
        value: (p as any).value || 0,
        currency: 'BRL',
        content_name: p.name,
        content_category: 'Subscription'
      });
      console.log(`[Pixel] Purchase tracked: ${p.name} - R$ ${(p as any).value}`);
    }

    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router, plan]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-900/50 animate-pulse">
            <Check size={48} className="text-white" />
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Bem-vindo ao StencilFlow! 🎉
          </h1>

          <p className="text-lg text-zinc-400 mb-2">
            Seu pagamento foi processado com sucesso
          </p>

          {details && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full mt-4">
              <details.icon className={`text-${details.color}-500`} size={20} />
              <span className="text-white font-semibold">{details.name}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 text-sm">{details.price}</span>
            </div>
          )}
        </div>

        {/* Plan Features */}
        {details && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="text-emerald-500" size={24} />
              Agora você tem acesso a:
            </h2>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {details.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-600/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="text-emerald-500" size={12} />
                  </div>
                  <span className="text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg"
          >
            Começar a Criar →
          </button>

          <button
            onClick={() => router.push('/editor')}
            className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all border border-zinc-700"
          >
            Ir para Editor
          </button>
        </div>

        {/* Auto-redirect Info */}
        <p className="text-center text-zinc-500 text-sm mt-8">
          Redirecionando automaticamente em 5 segundos...
        </p>

        {/* Support Info */}
        <div className="mt-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm mb-2">
            Precisa de ajuda? Estamos aqui para você!
          </p>
          <a
            href="mailto:suporte@stencilflow.com"
            className="text-emerald-500 hover:text-emerald-400 text-sm font-semibold"
          >
            suporte@stencilflow.com
          </a>
        </div>
      </div>
    </div>
  );
}
