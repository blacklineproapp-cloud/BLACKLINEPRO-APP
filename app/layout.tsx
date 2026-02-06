import './globals.css';
import Script from 'next/script';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.stencilflow.com.br'),
  title: {
    default: 'StencilFlow - Editor Profissional de Stencils de Tatuagem',
    template: '%s | StencilFlow'
  },
  description: 'Transforme qualquer imagem em stencil de tatuagem profissional com a Tecnologia StencilFlow. Editor completo, modo topográfico, linhas perfeitas e ferramentas premium. Grátis para começar.',
  applicationName: 'StencilFlow',
  authors: [{ name: 'StencilFlow' }],
  generator: 'Next.js',
  keywords: [
    'stencil tatuagem',
    'tattoo stencil',
    'editor stencil',
    'stencil profissional',
    'tatuagem',
    'design tattoo',
    'converter imagem stencil',
    'topográfico tattoo',
    'linhas perfeitas',
    'color match tattoo',
    'dividir a4',
    'aprimorar 4k',
    'ferramentas tatuador',
    'stencilflow'
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'StencilFlow',
  publisher: 'StencilFlow',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    statusBarStyle: 'black-translucent',
    title: 'StencilFlow',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'facebook-domain-verification': 'qtmtkry0hg77gejaacaw88z3g6l2nb',
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: 'https://www.stencilflow.com.br',
    languages: {
      'pt-BR': 'https://www.stencilflow.com.br',
      'en': 'https://www.stencilflow.com.br/en',
      'es': 'https://www.stencilflow.com.br/es',
      'fr': 'https://www.stencilflow.com.br/fr',
      'it': 'https://www.stencilflow.com.br/it',
      'ja': 'https://www.stencilflow.com.br/ja',
    }
  },
  openGraph: {
    type: 'website',
    url: 'https://www.stencilflow.com.br',
    siteName: 'StencilFlow',
    title: 'StencilFlow - Editor Profissional de Stencils de Tatuagem',
    description: 'Editor profissional de stencils com Tecnologia StencilFlow. Modo topográfico, linhas perfeitas, Color Match e mais. Grátis para começar.',
    locale: 'pt_BR',
    images: [
      {
        url: 'https://www.stencilflow.com.br/og-image.png',
        width: 1200,
        height: 630,
        alt: 'StencilFlow - Editor Profissional de Stencils de Tatuagem',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StencilFlow - Editor Profissional de Stencils',
    description: 'Editor profissional de stencils de tatuagem com Tecnologia StencilFlow e ferramentas premium. Grátis para começar.',
    images: ['https://www.stencilflow.com.br/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
    <>
      {/* Meta Pixel (Facebook Pixel) para Anúncios */}
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '925034426528491');
            fbq('track', 'PageView');
          `,
        }}
      />
      {children}
    </>
  );
}
