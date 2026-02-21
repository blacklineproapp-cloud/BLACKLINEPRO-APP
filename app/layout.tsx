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
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-P58Q7C45');
            `,
          }}
        />

        {/* Google Analytics 4 (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-GXBH5H30FY"
        />
        <Script
          id="ga4-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-GXBH5H30FY');
              gtag('config', 'G-QXBX5HJ8FV');
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-emerald-500/30">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-P58Q7C45"
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </>
  );
}
