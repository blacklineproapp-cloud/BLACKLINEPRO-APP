import { ClerkProvider } from '@clerk/nextjs';
import { ptBR } from '@clerk/localizations';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'StencilFlow - Crie Stencils de Tatuagem com IA | Editor Profissional',
  description: 'Transforme qualquer imagem em stencil de tatuagem profissional com IA Gemini 2.5. Editor completo, modo topográfico, linhas perfeitas e ferramentas premium. Grátis para começar.',
  applicationName: 'StencilFlow',
  authors: [{ name: 'StencilFlow Team' }],
  generator: 'Next.js',
  keywords: [
    'stencil tatuagem',
    'tattoo stencil',
    'ia tattoo',
    'editor stencil',
    'tatuagem',
    'design tattoo',
    'gemini ia',
    'converter imagem stencil',
    'topográfico tattoo',
    'linhas perfeitas',
    'color match tattoo',
    'dividir a4',
    'aprimorar 4k',
    'stencilflow'
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'StencilFlow',
  publisher: 'StencilFlow',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'StencilFlow',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'StencilFlow',
    title: 'StencilFlow - Crie Stencils de Tatuagem com IA',
    description: 'Editor profissional de stencils com IA Gemini 2.5. Modo topográfico, linhas perfeitas, Color Match e mais. Grátis para começar.',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StencilFlow - Crie Stencils com IA',
    description: 'Editor profissional de stencils de tatuagem. IA Gemini 2.5 + Ferramentas premium. Grátis para começar.',
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      localization={ptBR as any}
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
      <html lang="pt-BR">
        <body>
          {children}
          <ServiceWorkerRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
