import { ClerkProvider } from '@clerk/nextjs';
import { ptBR, enUS, esES, frFR, itIT, jaJP } from '@clerk/localizations';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';
// Note: document tags (html/head/body) removed — head moved to head.tsx
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import CookieConsent from '@/components/CookieConsent';
import '../globals.css';

// Mapeamento de locales para Clerk localizations
const clerkLocalizations = {
  pt: ptBR,
  en: enUS,
  es: esES,
  fr: frFR,
  it: itIT,
  ja: jaJP
} as const;

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: Props) {
  const { locale } = await params;
  // Validar locale
  const locales = ['pt', 'en', 'es', 'fr', 'it', 'ja'];
  if (!locales.includes(locale)) {
    notFound();
  }

  // Carregar mensagens para o locale atual
  const messages = await getMessages();

  // 🛡️ SANITIZAÇÃO: Garantir que apenas objetos puros sejam passados para o Client Provider
  // O Next.js 15 é rigoroso com serialização RSC. Erros de tradução podem gerar objetos complexos.
  const serializedMessages = JSON.parse(JSON.stringify(messages));

  return (
    <>
      <ClerkProvider
        dynamic
        localization={clerkLocalizations[locale as keyof typeof clerkLocalizations] as any}
        appearance={{
          baseTheme: undefined,
            variables: {
            colorPrimary: '#6366F1',
            colorBackground: '#18181b',
            colorText: '#ffffff',
            colorTextSecondary: '#a1a1aa',
            colorInputBackground: '#27272a',
            colorInputText: '#ffffff',
            borderRadius: '0.75rem',
          },
          elements: {
            rootBox: 'w-full',
            card: 'bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/50',
            headerTitle: 'text-white font-bold',
            headerSubtitle: 'text-zinc-400',
            socialButtonsBlockButton: 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 transition-colors',
            socialButtonsBlockButtonText: 'text-white font-medium',
            dividerLine: 'bg-zinc-700',
            dividerText: 'text-zinc-500',
            formFieldLabel: 'text-zinc-300 font-medium',
            formFieldInput: 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-indigo-500',
            formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg transition-all',
            footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-medium',
            footerActionText: 'text-zinc-400',
            identityPreviewText: 'text-white',
            identityPreviewEditButton: 'text-indigo-400 hover:text-indigo-300',
            formFieldInputShowPasswordButton: 'text-zinc-400 hover:text-white',
            alertText: 'text-zinc-300',
            formResendCodeLink: 'text-indigo-400 hover:text-indigo-300',
            otpCodeFieldInput: 'bg-zinc-800 border-zinc-700 text-white',
            userButtonPopoverCard: 'bg-zinc-900 border border-zinc-700',
            userButtonPopoverActionButton: 'text-white hover:bg-zinc-800',
            userButtonPopoverActionButtonText: 'text-white',
            userButtonPopoverFooter: 'hidden',
            userPreviewMainIdentifier: 'text-white',
            userPreviewSecondaryIdentifier: 'text-zinc-400',
          },
        }}
      >
        <NextIntlClientProvider messages={serializedMessages}>
          {children}
          <ServiceWorkerRegister />
          <CookieConsent />
        </NextIntlClientProvider>
      </ClerkProvider>
    </>
  );
}
