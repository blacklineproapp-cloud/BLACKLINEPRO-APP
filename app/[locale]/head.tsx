type Props = { params: { locale: string } };

const BASE_URL = 'https://www.blacklinepro.com.br';
const LOCALES = ['pt', 'en', 'es', 'fr', 'it', 'ja'];

export default function Head({ params }: Props) {
  const { locale } = params;

  return (
    <>
      {/* hreflang — all language variants + x-default */}
      {LOCALES.map(lang => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang === 'pt' ? 'pt-BR' : lang}
          href={lang === 'pt' ? BASE_URL : `${BASE_URL}/${lang}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={BASE_URL} />

      {/* Preconnect for performance */}
      <link rel="preconnect" href="https://generativelanguage.googleapis.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

      {/* Schema: Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Black Line Pro',
            url: BASE_URL,
            logo: `${BASE_URL}/icon-512x512.png`,
            description: 'Editor profissional de stencils e estênceis de tatuagem com IA',
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              availableLanguage: ['Portuguese', 'English', 'Spanish', 'French', 'Italian', 'Japanese'],
            },
            sameAs: [
              'https://github.com/blacklineproapp-cloud',
            ],
          }),
        }}
      />

      {/* Schema: WebSite with SearchAction */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Black Line Pro',
            url: BASE_URL,
            description: 'Editor profissional de stencils de tatuagem — gerador de estêncil com IA',
            inLanguage: locale,
          }),
        }}
      />

      {/* Schema: SoftwareApplication — enables rich snippets in Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Black Line Pro',
            description: 'Editor profissional de stencils e estênceis de tatuagem com IA. Gerador de estêncil, modo topográfico, linhas perfeitas, decalque profissional.',
            applicationCategory: 'DesignApplication',
            operatingSystem: 'Web',
            url: BASE_URL,
            image: `${BASE_URL}/og-image.png`,
            offers: [
              {
                '@type': 'Offer',
                name: 'Gratuito',
                price: '0',
                priceCurrency: 'BRL',
                description: 'Gerações ilimitadas com sua chave Gemini',
              },
              {
                '@type': 'Offer',
                name: 'Ink',
                price: '29',
                priceCurrency: 'BRL',
                description: '5GB nuvem, sem anúncios',
              },
              {
                '@type': 'Offer',
                name: 'Pro',
                price: '69',
                priceCurrency: 'BRL',
                description: '10GB nuvem, ferramentas premium',
              },
              {
                '@type': 'Offer',
                name: 'Studio',
                price: '199',
                priceCurrency: 'BRL',
                description: '25GB nuvem, equipe multi-usuário',
              },
            ],
            featureList: [
              'Editor de Stencil Profissional',
              'Gerador de Estêncil com IA',
              'Modo Topográfico',
              'Linhas Perfeitas',
              'Color Match',
              'Remove Background',
              'Enhance 4K',
              'Split A4',
            ],
          }),
        }}
      />
    </>
  );
}
