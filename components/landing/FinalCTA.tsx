'use client';

import { SignInButton, useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';

export default function FinalCTA({ totalUsers }: { totalUsers: number }) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const t = useTranslations('landing.finalCta');
  
  return (
    <section className="py-32 bg-gradient-to-br from-indigo-950/20 via-black to-black relative overflow-hidden border-t border-zinc-800">
      <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
          {t('title')}
        </h2>
        <p className="text-xl text-zinc-400 mb-10">
          {t('subtitle')} {totalUsers > 0 ? `${totalUsers}+` : t('thousands')} {t('subtitleEnd')}
        </p>

        {isSignedIn ? (
          <Button
            onClick={() => router.push('/dashboard')}
            size="xl"
            className="px-12 py-5 rounded-xl text-xl shadow-2xl shadow-indigo-900/50 hover:scale-105 transition-transform duration-300"
          >
            {t('dashboard')}
          </Button>
        ) : (
          <SignInButton mode="modal">
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-5 rounded-xl text-xl font-bold transition-all duration-300 shadow-2xl shadow-indigo-900/50 hover:scale-105">
              {t('cta')}
            </button>
          </SignInButton>
        )}

        <div className="flex flex-wrap justify-center gap-8 text-sm text-zinc-500 mt-10">
          {(['byok', 'cancel', 'control'] as const).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t(`checks.${key}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
