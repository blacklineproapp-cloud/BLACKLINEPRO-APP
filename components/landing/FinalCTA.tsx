'use client';

import { SignInButton, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function FinalCTA({ totalUsers }: { totalUsers: number }) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  return (
    <section className="py-32 bg-gradient-to-br from-emerald-950/20 via-black to-black relative overflow-hidden border-t border-zinc-800">
      <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
          Pronto para Criar Stencils Profissionais?
        </h2>
        <p className="text-xl text-zinc-400 mb-10">
          Junte-se a {totalUsers > 0 ? `${totalUsers}+` : 'milhares de'} tatuadores que já usam StencilFlow
        </p>

        {isSignedIn ? (
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-5 rounded-xl text-xl font-bold transition-all shadow-2xl shadow-emerald-900/50 hover:scale-105"
          >
            Ir para Dashboard
          </button>
        ) : (
          <SignInButton mode="modal">
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-5 rounded-xl text-xl font-bold transition-all shadow-2xl shadow-emerald-900/50 hover:scale-105">
              Criar Conta e Começar
            </button>
          </SignInButton>
        )}

        <div className="flex flex-wrap justify-center gap-8 text-sm text-zinc-500 mt-10">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Pague apenas pelo que usar</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Créditos nunca expiram</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Controle total de gastos</span>
          </div>
        </div>
      </div>
    </section>
  );
}
