'use client';

import { Check, Zap, Crown, Sparkles, Package, Infinity } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CheckoutModal from '@/components/CheckoutModal';
import { BILLING_CYCLES, PLAN_PRICING, formatPrice, getMonthlyEquivalent } from '@/lib/billing/plans';
import type { BillingCycle } from '@/lib/stripe/types';

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'studio' | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectPlan = (planId: string) => {
    // Abre o modal mesmo sem estar logado
    // O modal vai mostrar mensagem pedindo login se necessário
    if (planId === 'starter' || planId === 'pro' || planId === 'studio') {
      setSelectedPlan(planId);
      setIsModalOpen(true);
    }
  };

  const packages = [
    {
      id: 'starter',
      name: 'Starter',
      basePrice: 50,
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
      basePrice: 100,
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
      basePrice: 300,
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
        {/* Billing Cycle Selector */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl max-w-full">
            {(Object.entries(BILLING_CYCLES) as [BillingCycle, typeof BILLING_CYCLES[BillingCycle]][]).map(([cycle, info]) => (
              <button
                key={cycle}
                onClick={() => setSelectedCycle(cycle)}
                className={`relative px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  selectedCycle === cycle
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="whitespace-nowrap">{info.label}</span>
                  {info.badge && selectedCycle === cycle && (
                    <span className="text-[9px] sm:text-[10px] text-emerald-200 mt-0.5 hidden sm:inline">{info.badge}</span>
                  )}
                  {info.badge && selectedCycle !== cycle && (
                    <span className="text-[9px] sm:text-[10px] text-emerald-400 mt-0.5 hidden sm:inline">{info.badge}</span>
                  )}
                  {info.discount > 0 && (
                    <span className="text-[9px] text-emerald-400 mt-0.5 sm:hidden">-{info.discount}%</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Como Funciona */}
        <div className="bg-emerald-900/10 border border-emerald-800/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center flex-shrink-0">
              <Package className="text-emerald-500" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Como Funciona</h2>
              <p className="text-sm text-zinc-400 mb-3">
                Assine e use o StencilFlow durante todo o período escolhido. Cada plano tem um limite de gerações mensal incluído.
              </p>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>• <strong className="text-white">Assinatura recorrente</strong> - Renovação automática</li>
                <li>• Cancele a qualquer momento - Sem multas ou taxas</li>
                <li>• Limites renovam todo mês - Mesmo em planos anuais</li>
                <li>• Acesso imediato após pagamento - Comece a usar agora</li>
                {selectedCycle !== 'monthly' && (
                  <li className="text-emerald-400">
                    • <strong>Economize {BILLING_CYCLES[selectedCycle].discount}%</strong> pagando {BILLING_CYCLES[selectedCycle].label.toLowerCase()}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {packages.map((pkg) => {
            const pricing = PLAN_PRICING[pkg.id as 'starter' | 'pro' | 'studio'];
            const totalPrice = pricing[selectedCycle];
            const monthlyEquivalent = getMonthlyEquivalent(pkg.id as 'starter' | 'pro' | 'studio', selectedCycle);
            const savings = selectedCycle !== 'monthly' ? pkg.basePrice - monthlyEquivalent : 0;

            return (
              <div
                key={pkg.id}
                className={`relative bg-gradient-to-br ${pkg.bgGradient} border-2 ${pkg.borderColor} rounded-2xl p-6 sm:p-8 flex flex-col ${
                  pkg.popular ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black' : ''
                }`}
              >
                {/* Popular Badge */}
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <Crown size={12} />
                      MAIS POPULAR
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                    pkg.id === 'starter' ? 'bg-emerald-600/10 border border-emerald-500/30' :
                    pkg.id === 'pro' ? 'bg-purple-600/10 border border-purple-500/30' :
                    'bg-amber-600/10 border border-amber-500/30'
                  }`}
                >
                  <pkg.icon className={pkg.iconColor} size={28} />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-white mb-1">{pkg.name}</h3>
                <p className="text-zinc-400 text-sm mb-4">{pkg.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(monthlyEquivalent)}
                    </span>
                    <span className="text-zinc-500 text-sm">/mês</span>
                  </div>
                  {selectedCycle !== 'monthly' && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-zinc-500">
                        Cobrança {selectedCycle === 'quarterly' ? 'trimestral' : selectedCycle === 'semiannual' ? 'semestral' : 'anual'}: <strong className="text-white">{formatPrice(totalPrice)}</strong>
                      </p>
                      <p className="text-xs text-emerald-400 font-medium">
                        ✓ Economize {formatPrice(savings)}/mês ({BILLING_CYCLES[selectedCycle].discount}% off)
                      </p>
                    </div>
                  )}
                  <p className="text-zinc-500 text-xs mt-2">{pkg.limit}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(pkg.id)}
                  className={`w-full ${pkg.buttonColor} text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg`}
                >
                  Assinar {pkg.name}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ/Info adicional */}
        <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-white font-bold text-lg mb-4">Perguntas Frequentes</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-white font-medium mb-1">Posso mudar de plano depois?</p>
              <p className="text-zinc-400">Sim! Você pode fazer upgrade ou downgrade a qualquer momento.</p>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Como funciona o cancelamento?</p>
              <p className="text-zinc-400">Você pode cancelar quando quiser. Continuará com acesso até o fim do período pago.</p>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Aceitam quais formas de pagamento?</p>
              <p className="text-zinc-400">Cartão de crédito e boleto bancário (para planos anuais).</p>
            </div>
            {selectedCycle !== 'monthly' && (
              <div>
                <p className="text-white font-medium mb-1">Como funciona a renovação do plano {selectedCycle === 'quarterly' ? 'trimestral' : selectedCycle === 'semiannual' ? 'semestral' : 'anual'}?</p>
                <p className="text-zinc-400">
                  Renovação automática a cada {selectedCycle === 'quarterly' ? '3 meses' : selectedCycle === 'semiannual' ? '6 meses' : '12 meses'}.
                  Você receberá um email 7 dias antes da renovação.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          cycle={selectedCycle}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
}
