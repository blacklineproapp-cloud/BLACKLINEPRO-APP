'use client';

import { SignInButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HeroSection() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  return (
    <section className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-black to-zinc-950" />

      {/* Content */}
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10 py-20">
        {/* Texto + CTAs */}
        <div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Transforme Qualquer Imagem em Stencil de Tatuagem Profissional
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 mb-8">
            Tecnologia avançada + Editor completo + Ferramentas premium. Pague apenas pelo que usar.
          </p>

          {/* Social proof inline */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-500 mb-10">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Tecnologia Stencil Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Alta Fidelidade</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Pronto para Imprimir</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isSignedIn ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-emerald-900/50 hover:scale-105"
              >
                Ir para Dashboard
              </button>
            ) : (
              <SignInButton mode="modal">
                <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-emerald-900/50 hover:scale-105">
                  Criar Conta
                </button>
              </SignInButton>
            )}
            <Link
              href="/pricing"
              className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600/10 px-10 py-4 rounded-xl text-lg font-semibold transition-all text-center"
            >
              Ver Preços
            </Link>
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            Assinatura mensal a partir de R$ 50 • Cancele quando quiser • Acesso imediato
          </p>
        </div>

        {/* Preview visual (placeholder) */}
        <div className="relative">
          <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
            <div className="aspect-square bg-zinc-900/50 rounded-xl flex items-center justify-center">
              <svg className="w-32 h-32 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
