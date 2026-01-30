'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, QrCode, FileText, Info } from 'lucide-react';

interface MigrationNoticeCardProps {
  userName?: string;
}

export default function MigrationNoticeCard({ userName }: MigrationNoticeCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Verificar se já foi fechado anteriormente
  useEffect(() => {
    const dismissed = localStorage.getItem('migration_notice_dismissed');
    if (dismissed) {
      setIsDismissed(true);
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('migration_notice_dismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-900/40 to-blue-900/40 border border-emerald-500/30 rounded-2xl p-5 mb-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
        aria-label="Fechar aviso"
      >
        <X size={18} />
      </button>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Info className="text-emerald-400" size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">
              Atualizamos nosso sistema de pagamentos!
            </h3>
            <p className="text-zinc-400 text-sm mt-0.5">
              Mais opções e segurança para você
            </p>
          </div>
        </div>

        {/* Payment methods */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <QrCode className="text-emerald-400 mx-auto mb-1.5" size={24} />
            <p className="text-white text-sm font-medium">PIX</p>
            <p className="text-emerald-400 text-xs">Instantâneo</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <FileText className="text-amber-400 mx-auto mb-1.5" size={24} />
            <p className="text-white text-sm font-medium">Boleto</p>
            <p className="text-amber-400 text-xs">Até 3 dias</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <CreditCard className="text-purple-400 mx-auto mb-1.5" size={24} />
            <p className="text-white text-sm font-medium">Cartão</p>
            <p className="text-purple-400 text-xs">Recorrente</p>
          </div>
        </div>

        {/* Important info */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            Como funciona a recorrência:
          </h4>
          <ul className="text-zinc-300 text-sm space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">•</span>
              <span>A cobrança será gerada na data do seu primeiro pagamento</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">•</span>
              <span>Você terá até <strong className="text-white">7 dias</strong> para realizar o pagamento</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">•</span>
              <span>Após o pagamento, a recorrência automática é ativada</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">•</span>
              <span>Suas informações e histórico foram mantidos</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-3 text-center">
          Dúvidas? Entre em contato pelo suporte.
        </p>
      </div>
    </div>
  );
}
