import { ClerkProvider } from '@clerk/nextjs';
import { ptBR, enUS, esES, frFR, itIT, jaJP } from '@clerk/localizations';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import CookieConsent from '@/components/CookieConsent';

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
  children: ReactNode;
  params: { locale: string }; // Next.js 14: params é objeto síncrono
};

export default async function LocaleLayout({
  children,
  params: { locale }
}: Props) {
  // Validar locale
  const locales = ['pt', 'en', 'es', 'fr', 'it', 'ja'];
  if (!locales.includes(locale)) {
    notFound();
  }

  // Carregar mensagens para o locale atual
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* JSON-LD para Logo da Organização no Google Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'StencilFlow',
              url: 'https://www.stencilflow.com.br',
              logo: 'https://www.stencilflow.com.br/icon-512x512.png',
              description: 'Editor profissional de stencils de tatuagem com tecnologia avançada',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                availableLanguage: ['Portuguese', 'English', 'Spanish', 'French', 'Italian', 'Japanese'],
              },
            }),
          }}
        />
        {/* JSON-LD para WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'StencilFlow',
              url: 'https://www.stencilflow.com.br',
              description: 'Editor profissional de stencils de tatuagem',
              inLanguage: locale,
            }),
          }}
        />
      </head>
      <body>
        <ClerkProvider
          localization={clerkLocalizations[locale as keyof typeof clerkLocalizations] as any}
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: '#10b981',
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
              formFieldInput: 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500',
              formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg transition-all',
              footerActionLink: 'text-emerald-400 hover:text-emerald-300 font-medium',
              footerActionText: 'text-zinc-400',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-emerald-400 hover:text-emerald-300',
              formFieldInputShowPasswordButton: 'text-zinc-400 hover:text-white',
              alertText: 'text-zinc-300',
              formResendCodeLink: 'text-emerald-400 hover:text-emerald-300',
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
          <NextIntlClientProvider messages={messages}>
            {children}
            <ServiceWorkerRegister />
            <CookieConsent />
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
