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
      <div className="relative w-full max-w-lg bg-[#0c0c0e] border border-zinc-800/50 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        
        {/* Top Header - Vermelho Segurança */}
        <div className="bg-gradient-to-r from-red-600/20 via-orange-600/10 to-transparent p-6 flex items-start gap-4">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 p-3 rounded-2xl shadow-lg shadow-red-900/30">
            <Shield className="text-white" size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Comunicado Oficial de Segurança</h2>
            <p className="text-xs font-bold text-orange-500/80 uppercase tracking-widest mt-0.5">Atenção Importante</p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-6">
          
          {/* Alerta de Site Falso */}
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 relative overflow-hidden">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider italic">Alerta de Site Falso</h3>
             </div>
             <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                Informamos que o site <span className="text-zinc-300 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">www.stencilflowapp.com.br</span> <span className="text-red-400 font-bold uppercase tracking-tighter">NÃO É OFICIAL</span>. Trata-se de um plágio e as medidas cabíveis já estão sendo tomadas na justiça. Utilize apenas nossos canais oficiais.
             </p>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed font-medium px-1">
            Pedimos sinceras desculpas pelo transtorno causado por esta situação. Para compensar o inconveniente e reafirmar nosso compromisso com você:
          </p>

          {/* Acesso Gratuito Section */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex items-center gap-4 group hover:bg-emerald-500/10 transition-colors">
            <div className="bg-emerald-500/10 p-3 rounded-xl">
              <Gift className="text-emerald-500 group-hover:scale-110 transition-transform" size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-400">Acesso Gratuito Liberado</h4>
              <p className="text-sm text-zinc-500 font-medium">Todos os usuários ativos têm acesso garantido até <span className="text-white font-bold">10/03/2026</span>.</p>
            </div>
          </div>

          {/* Suporte Section */}
          <div className="space-y-3 pt-2">
             <h5 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Problemas com acesso?</h5>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a href="https://wa.me/5521959240453" target="_blank" className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-all border-l-2 hover:border-l-emerald-500">
                   <Smartphone size={16} className="text-emerald-500" />
                   <div className="text-[10px]">
                      <p className="text-zinc-500 font-bold uppercase">WhatsApp / Telefone</p>
                      <p className="text-white font-bold">+55 21 95924-0453</p>
                   </div>
                </a>
                <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800/50 rounded-xl border-l-2 hover:border-l-blue-500 group">
                   <Mail size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                   <div className="text-[10px]">
                      <p className="text-zinc-500 font-bold uppercase">Recuperação de Acesso</p>
                      <p className="text-white font-bold">Envie seu email cadastrado</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Footer Signature */}
          <p className="text-center text-[10px] text-zinc-600 font-bold mt-4">
            Stencil Flow continua forte e com tecnologia de ponta. Atualizações em breve.
          </p>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800/30">
          <button 
            onClick={handleClose}
            className="w-full bg-white hover:bg-zinc-200 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            Entendido, acessar minha conta
          </button>
        </div>
      </div>
    </div>
  );
}
