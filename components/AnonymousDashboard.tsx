'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignInButton } from '@clerk/nextjs';
import { storage } from '@/lib/client-storage';
import { useApiKey } from '@/hooks/useApiKey';
import ApiKeySetupModal from '@/components/ApiKeySetupModal';
import { Key, Cloud, Sparkles, PenTool, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AnonymousDashboard() {
  const router = useRouter();
  const { hasKey, isLoaded } = useApiKey();
  const [lastStencil, setLastStencil] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    storage.get<string>('generated_image').then((img) => {
      if (img) setLastStencil(img);
    });
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
            Bem-vindo ao Black Line Pro
          </h1>
          <p className="text-zinc-500 text-sm">
            {hasKey
              ? 'Sua chave Gemini está configurada — gerações ilimitadas ativas.'
              : 'Configure sua chave Gemini gratuita para começar a gerar stencils.'}
          </p>
        </div>

        {/* BYOK Status Card */}
        {isLoaded && !hasKey && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 mb-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <Key size={18} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm mb-1">Configure sua chave Gemini (grátis)</p>
              <p className="text-zinc-400 text-xs mb-3">
                Crie uma chave gratuita no Google AI Studio e cole aqui para gerar stencils ilimitados — sem custo.
              </p>
              <Button
                onClick={() => setShowApiKeyModal(true)}
                size="sm"
                className="text-xs px-4 py-2 rounded-lg"
              >
                Configurar chave Gemini
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Button
            onClick={() => router.push('/editor')}
            variant="secondary"
            className="bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-indigo-500/30 rounded-2xl p-5 h-auto gap-4 text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600/20 transition-colors">
              <PenTool size={22} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Editor de Stencil</p>
              <p className="text-zinc-500 text-xs">Converta qualquer foto em stencil</p>
            </div>
            <ArrowRight size={16} className="text-zinc-400 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
          </Button>

          <Button
            onClick={() => router.push('/generator')}
            variant="secondary"
            className="bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-indigo-500/30 rounded-2xl p-5 h-auto gap-4 text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600/20 transition-colors">
              <Sparkles size={22} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Generator com IA</p>
              <p className="text-zinc-500 text-xs">Crie designs de zero com texto</p>
            </div>
            <ArrowRight size={16} className="text-zinc-400 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
          </Button>
        </div>

        {/* Last Generated Stencil */}
        {lastStencil && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-zinc-400" />
                <p className="text-sm font-semibold text-white">Último stencil gerado</p>
              </div>
              <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">Local</span>
            </div>
            <div className="relative w-full aspect-video bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lastStencil}
                alt="Último stencil gerado"
                className="max-h-48 object-contain"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => router.push('/editor')}
                className="flex-1 text-xs py-2 rounded-lg"
              >
                Continuar no editor
              </Button>
              <a
                href={lastStencil}
                download={`blacklinepro-stencil.png`}
                className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg font-semibold transition-colors text-center"
              >
                Baixar PNG
              </a>
            </div>
          </div>
        )}

        {/* Cloud Storage CTA */}
        <div className="bg-gradient-to-br from-indigo-950/30 to-zinc-900 border border-indigo-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Cloud size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm mb-1">
              Salve seus stencils na nuvem
            </p>
            <p className="text-zinc-400 text-xs">
              Crie uma conta gratuita para acessar seus stencils de qualquer dispositivo.
              Planos a partir de R$29/mês incluem 5 GB de armazenamento em nuvem.
            </p>
          </div>
          <SignInButton mode="modal">
            <button className="flex-shrink-0 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold transition-colors whitespace-nowrap">
              Criar conta grátis
            </button>
          </SignInButton>
        </div>

      </div>

      <ApiKeySetupModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={() => setShowApiKeyModal(false)}
      />
    </div>
  );
}
