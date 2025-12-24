import { Upload, Sparkles, Download } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Upload',
      description: 'Envie sua imagem (foto, desenho ou referência)',
      icon: Upload,
      color: 'emerald'
    },
    {
      number: 2,
      title: 'IA Processa',
      description: 'Nossa IA converte em stencil perfeito em segundos',
      icon: Sparkles,
      color: 'purple'
    },
    {
      number: 3,
      title: 'Download',
      description: 'Baixe PNG pronto para imprimir e tatuar',
      icon: Download,
      color: 'blue'
    }
  ];

  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-600/10',
      border: 'border-emerald-600/20',
      text: 'text-emerald-500',
      gradient: 'from-emerald-900/20'
    },
    purple: {
      bg: 'bg-purple-600/10',
      border: 'border-purple-600/20',
      text: 'text-purple-500',
      gradient: 'from-purple-900/20'
    },
    blue: {
      bg: 'bg-blue-600/10',
      border: 'border-blue-600/20',
      text: 'text-blue-500',
      gradient: 'from-blue-900/20'
    }
  };

  return (
    <section className="py-20 bg-black">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Como Funciona
          </h2>
          <p className="text-lg text-zinc-400">
            Simples, rápido e profissional
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => {
            const colors = colorClasses[step.color as keyof typeof colorClasses];
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className={`bg-gradient-to-br ${colors.gradient} to-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center relative`}
              >
                {/* Número do passo */}
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text} font-bold text-sm`}>
                  {step.number}
                </div>

                {/* Ícone */}
                <div className={`w-16 h-16 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center mx-auto mb-6 mt-4`}>
                  <Icon className={colors.text} size={32} />
                </div>

                {/* Conteúdo */}
                <h3 className="text-2xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-zinc-400">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
