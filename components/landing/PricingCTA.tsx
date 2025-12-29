import Link from 'next/link';
import { Zap, Crown, Sparkles, Infinity, Package } from 'lucide-react';

export default function PricingCTA() {
  const plans = [
    {
      name: 'Starter',
      price: 'R$ 50',
      period: '/mês',
      limit: '100 gerações/mês',
      icon: Zap,
      color: 'emerald',
      features: [
        'Editor de Stencil completo',
        'Modo Topográfico',
        'Modo Linhas Perfeitas',
        'Controle total de gastos'
      ]
    },
    {
      name: 'Pro',
      price: 'R$ 100',
      period: '/mês',
      limit: '500 gerações/mês',
      icon: Crown,
      color: 'purple',
      popular: true,
      features: [
        'Tudo do Starter',
        'Geração de designs do zero',
        'Color Match + Enhance 4K',
        'Dividir A4'
      ]
    },
    {
      name: 'Studio',
      price: 'R$ 300',
      period: '/mês',
      limit: '7.500 gerações/mês',
      icon: Sparkles,
      color: 'amber',
      features: [
        'Tudo do Pro',
        'Até 7.500 gerações/mês',
        'Suporte prioritário',
        'Ideal para estúdios'
      ]
    },
    {
      name: 'Enterprise',
      price: 'R$ 600',
      period: '/mês',
      limit: 'Ilimitado',
      icon: Package,
      color: 'blue',
      features: [
        'Tudo do Studio',
        'Uso ILIMITADO',
        'Suporte dedicado 24/7',
        'SLA garantido 99.9%'
      ]
    }
  ];

  const colorClasses = {
    emerald: {
      gradient: 'from-emerald-900/20 to-zinc-900',
      border: 'border-emerald-500/50',
      icon: 'text-emerald-400'
    },
    purple: {
      gradient: 'from-purple-900/20 to-zinc-900',
      border: 'border-purple-500',
      icon: 'text-purple-400'
    },
    amber: {
      gradient: 'from-amber-900/20 to-zinc-900',
      border: 'border-amber-500',
      icon: 'text-amber-400'
    },
    blue: {
      gradient: 'from-blue-900/20 to-zinc-900',
      border: 'border-blue-500',
      icon: 'text-blue-400'
    }
  };

  return (
    <section className="py-20 bg-zinc-950 border-y border-zinc-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Escolha seu Plano
          </h2>
          <p className="text-lg text-zinc-400">
            Assinatura mensal. Cancele quando quiser.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const colors = colorClasses[plan.color as keyof typeof colorClasses];
            const Icon = plan.icon;

            return (
              <div
                key={plan.name}
                className={`bg-gradient-to-br ${colors.gradient} border-2 ${colors.border} rounded-2xl p-6 relative ${
                  plan.popular ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                    MAIS POPULAR
                  </div>
                )}

                <div className={`w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4`}>
                  <Icon className={colors.icon} size={24} />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  {plan.name}
                </h3>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">
                      {plan.price}
                    </span>
                    <span className="text-zinc-400">
                      {plan.period}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    {plan.limit === 'Ilimitado' ? (
                      <>
                        <Infinity className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-medium">{plan.limit}</span>
                      </>
                    ) : (
                      <span>{plan.limit}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-emerald-500 hover:text-emerald-400 font-semibold transition-colors"
          >
            Ver Todos os Planos e Detalhes
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
