'use client';

import { Check, Zap, Crown, Sparkles, Package, Infinity } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CheckoutModal from '@/components/CheckoutModal';

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'studio' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectPlan = (planId: string) => {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    if (planId === 'starter' || planId === 'pro' || planId === 'studio') {
      setSelectedPlan(planId);
      setIsModalOpen(true);
    }
  };

  const packages = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'R$ 50',
      period: '/mês',
      limit: '100 gerações/mês',
      description: 'Ideal para começar',
      icon: Zap,
      iconColor: 'text-emerald-400',
      bgGradient: 'from-emerald-900/20 to-zinc-900',
      borderColor: 'border-emerald-500/50',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-500',
      features: [
        'Editor de Stencil completo',
        'Modo Topográfico',
        'Modo Linhas Perfeitas',
        'Controle de intensidade',
        'Ajuste de tamanho (cm)',
        'Salvar projetos ilimitados',
        'Download em alta qualidade',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'R$ 100',
      period: '/mês',
      limit: '500 gerações/mês',
      description: 'Para tatuadores profissionais',
      icon: Crown,
      iconColor: 'text-purple-400',
      bgGradient: 'from-purple-900/20 to-zinc-900',
      borderColor: 'border-purple-500',
      buttonColor: 'bg-purple-600 hover:bg-purple-500',
      popular: true,
      features: [
        'Tudo do plano Starter',
        '✨ Geração de designs do zero',
        '🎨 Aprimorar imagem (4K)',
        '🎨 Color Match (tintas)',
        '📄 Dividir em A4',
        'Configuração de overlap',
        'Preview interativo de grid',
        'Exportar múltiplas folhas',
      ],
    },
    {
      id: 'studio',
      name: 'Studio',
      price: 'R$ 300',
      period: '/mês',
      limit: 'Ilimitado',
      description: 'Para estúdios e uso intensivo',
      icon: Sparkles,
      iconColor: 'text-amber-400',
      bgGradient: 'from-amber-900/20 to-zinc-900',
      borderColor: 'border-amber-500',
      buttonColor: 'bg-amber-600 hover:bg-amber-500',
      features: [
        'Tudo do plano Pro',
        '🏆 Uso ilimitado',
        '⚡ Prioridade no suporte',
        '💎 Ideal para estúdios',
        'Múltiplos tatuadores',
        'Sem limites mensais',
        'Relatórios de uso',
        'Suporte prioritário',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Planos de Assinatura
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-zinc-400 hover:text-white text-sm transition-colors"
            >
              ← Voltar
            </button>
          </div>
          <p className="mt-2 text-sm sm:text-base text-zinc-400">
            Escolha o plano ideal para você. Cancele quando quiser.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Como Funciona */}
        <div className="bg-emerald-900/10 border border-emerald-800/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center flex-shrink-0">
              <Package className="text-emerald-500" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Como Funciona</h2>
              <p className="text-sm text-zinc-400 mb-3">
                Assine e use o StencilFlow durante todo o mês. Cada plano tem um limite de gerações incluído.
              </p>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>• <strong className="text-white">Assinatura mensal recorrente</strong></li>
                <li>• Cancele a qualquer momento</li>
                <li>• Limites renovam todo mês</li>
                <li>• Acesso imediato após pagamento</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-gradient-to-br ${pkg.bgGradient} border-2 ${pkg.borderColor} rounded-2xl p-6 sm:p-8 flex flex-col ${
                pkg.popular ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black' : ''
              }`}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                  MAIS POPULAR
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4`}>
                <pkg.icon className={`${pkg.iconColor}`} size={24} />
              </div>

              {/* Package Name */}
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {pkg.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-zinc-400 mb-4">
                {pkg.description}
              </p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    {pkg.price}
                  </span>
                  <span className="text-zinc-400 text-lg">
                    {pkg.period}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  {pkg.limit === 'Ilimitado' ? (
                    <>
                      <Infinity className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400 font-medium">{pkg.limit}</span>
                    </>
                  ) : (
                    <span>{pkg.limit}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <Check className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectPlan(pkg.id)}
                className={`w-full py-3 sm:py-4 rounded-xl font-bold text-white ${pkg.buttonColor} transition-all shadow-lg`}
              >
                Assinar Agora
              </button>
            </div>
          ))}
        </div>

        {/* FAQ / Info */}
        <div className="mt-12 sm:mt-16 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
            Perguntas Frequentes
          </h2>

          <div className="space-y-6 text-sm sm:text-base">
            <div>
              <h3 className="text-white font-semibold mb-2">
                O que acontece quando atinjo o limite?
              </h3>
              <p className="text-zinc-400">
                Você pode fazer upgrade para um plano maior ou aguardar a renovação mensal.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">
                Posso cancelar a qualquer momento?
              </h3>
              <p className="text-zinc-400">
                Sim! Você pode cancelar sua assinatura quando quiser. O acesso continua até o fim do período pago.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">
                Como funciona o pagamento?
              </h3>
              <p className="text-zinc-400">
                Os pagamentos são processados de forma segura via Stripe. A cobrança é mensal e automática.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">
                Posso trocar de plano depois?
              </h3>
              <p className="text-zinc-400">
                Sim! Você pode fazer upgrade ou downgrade a qualquer momento. A diferença é calculada automaticamente.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">
                Qual a diferença entre os planos?
              </h3>
              <p className="text-zinc-400">
                O <strong>Starter</strong> oferece o editor completo. O <strong>Pro</strong> adiciona geração IA, Color Match e ferramentas avançadas. O <strong>Studio</strong> oferece uso ilimitado para estúdios.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            Tem dúvidas? Entre em contato: <a href="mailto:suporte@stencilflow.com" className="text-emerald-500 hover:text-emerald-400 underline">suporte@stencilflow.com</a>
          </p>
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
