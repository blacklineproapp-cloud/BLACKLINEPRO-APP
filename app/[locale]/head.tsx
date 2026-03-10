type Props = { params: { locale: string } };

export default function Head({ params }: Props) {
  const { locale } = params;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Black Line Pro',
            url: 'https://www.blacklinepro.com.br',
            logo: 'https://www.blacklinepro.com.br/icon-512x512.png',
            description: 'Editor profissional de stencils de tatuagem com tecnologia avançada',
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              availableLanguage: ['Portuguese', 'English', 'Spanish', 'French', 'Italian', 'Japanese'],
            },
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Black Line Pro',
            url: 'https://www.blacklinepro.com.br',
            description: 'Editor profissional de stencils de tatuagem',
            inLanguage: locale,
          }),
        }}
      />
    </>
  );
}
