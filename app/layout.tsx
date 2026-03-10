import './globals.css';
import Script from 'next/script';
import type { Metadata, Viewport } from 'next';
import { Roboto, Roboto_Mono } from 'next/font/google';

const roboto = Roboto({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.blacklinepro.com.br'),
  title: {
    default: 'Black Line Pro - Editor Profissional de Stencils de Tatuagem',
    template: '%s | Black Line Pro'
  },
  description: 'Transforme qualquer imagem em stencil de tatuagem profissional com a Tecnologia Black Line Pro. Editor completo, modo topográfico, linhas perfeitas e ferramentas premium. Grátis para começar.',
  applicationName: 'Black Line Pro',
  authors: [{ name: 'Black Line Pro' }],
  generator: 'Next.js',
  keywords: [
    'stencil tatuagem',
    'stencil de tatuagem',
    'tattoo stencil',
    'tattoo stencil maker',
    'stencil generator',
    'editor stencil',
    'editor de estêncil',
    'estêncil tatuagem',
    'gerador de estêncil',
    'decalque tatuagem',
    'tattoo transfer',
    'converter imagem stencil',
    'stencil profissional',
    'topográfico tattoo',
    'linhas perfeitas tatuagem',
    'Black Line Pro',
    'blackline pro',
    'blackline',
    'ferramentas tatuador',
    'tattoo design tool',
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'Black Line Pro',
  publisher: 'Black Line Pro',
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
    title: 'Black Line Pro',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: 'https://www.blacklinepro.com.br',
    languages: {
      'pt-BR': 'https://www.blacklinepro.com.br',
      'en':    'https://www.blacklinepro.com.br/en',
      'es':    'https://www.blacklinepro.com.br/es',
      'fr':    'https://www.blacklinepro.com.br/fr',
      'it':    'https://www.blacklinepro.com.br/it',
      'ja':    'https://www.blacklinepro.com.br/ja',
    }
  },
  openGraph: {
    type: 'website',
    url: 'https://www.blacklinepro.com.br',
    siteName: 'Black Line Pro',
    title: 'Black Line Pro - Editor Profissional de Stencils de Tatuagem',
    description: 'Editor profissional de stencils com Tecnologia Black Line Pro. Modo topográfico, linhas perfeitas, Color Match e mais. Grátis para começar.',
    locale: 'pt_BR',
    images: [
      {
        url: 'https://www.blacklinepro.com.br/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Black Line Pro - Editor Profissional de Stencils de Tatuagem',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Black Line Pro - Editor Profissional de Stencils',
    description: 'Editor profissional de stencils de tatuagem com Tecnologia Black Line Pro e ferramentas premium. Grátis para começar.',
    images: ['https://www.blacklinepro.com.br/og-image.png'],
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
  themeColor: '#6366F1',
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
    <html lang="pt-BR" className={`${roboto.variable} ${robotoMono.variable}`}>
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

        {/* Google AdSense — uses script tag directly to avoid data-nscript warning */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="antialiased selection:bg-indigo-500/30">
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
    </html>
  );
}
