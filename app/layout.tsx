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
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
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
          colorPrimary: '#000000',
          colorBackground: '#000000',
          colorText: '#ffffff',
        },
        elements: {
          formButtonPrimary: 'bg-white text-black hover:bg-gray-200',
          card: 'bg-black border border-gray-800',
          headerTitle: 'text-white',
          headerSubtitle: 'text-gray-400',
          socialButtonsBlockButton: 'border-gray-800 text-white hover:bg-gray-900',
          formFieldLabel: 'text-white',
          formFieldInput: 'bg-gray-900 border-gray-800 text-white',
          footerActionLink: 'text-white hover:text-gray-300',
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
