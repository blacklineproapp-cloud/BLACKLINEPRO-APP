'use client';

import { useState } from 'react';
import { Gift, CreditCard, X } from 'lucide-react';
import CheckoutModal from './CheckoutModal';

interface LegacyPaymentBannerProps {
  userId: string;
  userEmail: string;
}

export default function LegacyPaymentBanner({ userId, userEmail }: LegacyPaymentBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  if (isDismissed) return null;

  return (
    <>
      <div className="relative bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-2 border-amber-500 rounded-xl p-6 mb-6">
        {/* Close Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4 pr-8">
          {/* Icon */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Gift className="text-white" size={32} />
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="text-white font-bold text-xl mb-2">
              🎁 Plano Legacy Atribuído!
            </h3>
            
            <p className="text-zinc-300 text-sm mb-3">
              Você foi selecionado para o <strong>plano especial Legacy</strong> - 
              apenas <strong className="text-amber-400">R$ 25/mês</strong> com acesso completo ao editor de stencils.
            </p>

            <div className="bg-black/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-zinc-400 mb-2">✨ <strong className="text-white">Benefícios inclusos:</strong></p>
              <ul className="text-xs text-zinc-300 space-y-1">
                <li>✅ Editor de Stencil completo</li>
                <li>✅ Modo Topográfico e Linhas Perfeitas</li>
                <li>✅ 100 gerações por mês</li>
                <li>✅ Download em alta qualidade</li>
              </ul>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => setShowCheckout(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-xl transition-all shadow-lg text-sm"
            >
              <CreditCard size={20} />
              Pagar R$ 25/mês e Ativar Agora
            </button>

            <p className="text-xs text-zinc-500 mt-3">
              💳 Pagamento seguro via Stripe • Cancele quando quiser
            </p>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        plan="legacy"
        cycle="monthly"
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
      />
    </>
  );
}
