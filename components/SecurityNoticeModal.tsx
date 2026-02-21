'use client';

import { useState, useEffect } from 'react';
import { Shield, X, Gift, Smartphone, Mail } from 'lucide-react';

export default function SecurityNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verificar se já foi visualizado nesta sessão/dispositivo
    const hasSeen = localStorage.getItem('stencilflow_security_notice_2026_03');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('stencilflow_security_notice_2026_03', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop com blur pesado */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-500" 
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg max-h-[90vh] my-8 bg-[#0c0c0e] border border-zinc-800/50 rounded-[24px] md:rounded-[32px] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 scrollbar-hide">
        
        {/* Top Header - Vermelho Segurança */}
        <div className="sticky top-0 z-10 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-zinc-800/30 bg-gradient-to-r from-red-600/20 via-orange-600/10 to-transparent p-4 md:p-6 flex items-start gap-3 md:gap-4">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 p-2 md:p-3 rounded-xl md:rounded-2xl shadow-lg shadow-red-900/30 shrink-0">
            <Shield className="text-white" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight">Comunicado Oficial de Segurança</h2>
            <p className="text-[10px] font-bold text-orange-500/80 uppercase tracking-widest mt-0.5">Atenção Importante</p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-5 md:p-8 space-y-5 md:space-y-6">
          
          {/* Alerta de Site Falso */}
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 relative overflow-hidden">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider italic">Alerta de Site Falso</h3>
             </div>
             <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                Informamos que o site <span className="text-zinc-300 font-mono bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800 text-[12px]">www.stencilflowapp.com.br</span> <span className="text-red-400 font-bold uppercase tracking-tighter">NÃO É OFICIAL</span>.
             </p>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed font-medium px-1">
            Reafirmamos nosso compromisso com você:
          </p>

          {/* Acesso Gratuito Section */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 md:p-5 flex items-center gap-4 group hover:bg-emerald-500/10 transition-colors">
            <div className="bg-emerald-500/10 p-2.5 md:p-3 rounded-xl shrink-0">
              <Gift className="text-emerald-500 group-hover:scale-110 transition-transform" size={24} />
            </div>
            <div>
              <h4 className="text-sm md:text-base font-bold text-emerald-400">Acesso Gratuito Liberado</h4>
              <p className="text-xs md:text-sm text-zinc-500 font-medium">Até <span className="text-white font-bold">10/03/2026</span>.</p>
            </div>
          </div>

          {/* Suporte Section */}
          <div className="space-y-3 pt-2">
             <h5 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Dúvidas?</h5>
             <div className="grid grid-cols-1 gap-3">
                <a href="https://wa.me/5521959240453" target="_blank" className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-all border-l-2 border-l-emerald-500/50 hover:border-l-emerald-500">
                   <Smartphone size={16} className="text-emerald-500" />
                   <div className="text-[10px]">
                      <p className="text-zinc-500 font-bold uppercase">WhatsApp</p>
                      <p className="text-white font-bold">+55 21 95924-0453</p>
                   </div>
                </a>
             </div>
          </div>

          {/* Footer Signature */}
          <p className="text-center text-[10px] text-zinc-600 font-bold mt-2">
            Stencil Flow tecnologia de ponta.
          </p>
        </div>

        {/* Action Button */}
        <div className="sticky bottom-0 p-4 bg-[#0c0c0e] border-t border-zinc-800/30">
          <button 
            onClick={handleClose}
            className="w-full bg-white hover:bg-zinc-200 text-black py-4 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
