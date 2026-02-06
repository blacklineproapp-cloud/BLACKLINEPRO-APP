import { useTranslations } from 'next-intl';

export default function ComparisonTable() {
  const t = useTranslations('landing.comparison');
  
  const features = [
    { name: t('features.editor'), stencilflow: t('full'), ghostline: t('basic'), tattooStencilPro: t('limited') },
    { name: t('features.designGen'), stencilflow: 'Stencil Flow Tech', ghostline: false, tattooStencilPro: false },
    { name: t('features.topographic'), stencilflow: true, ghostline: false, tattooStencilPro: true },
    { name: t('features.lines'), stencilflow: true, ghostline: true, tattooStencilPro: false },
    { name: t('features.size'), stencilflow: true, ghostline: false, tattooStencilPro: true },
    { name: t('features.colorMatch'), stencilflow: true, ghostline: false, tattooStencilPro: false },
    { name: t('features.splitA4'), stencilflow: true, ghostline: false, tattooStencilPro: false },
    { name: t('features.enhance4k'), stencilflow: true, ghostline: false, tattooStencilPro: false },
    { name: t('features.price'), stencilflow: t('priceStarting'), ghostline: 'R$ 97+', tattooStencilPro: 'R$ 145+' },
    { name: t('features.free'), stencilflow: false, ghostline: false, tattooStencilPro: false },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-emerald-500 text-xl">✓</span>
      ) : (
        <span className="text-zinc-600 text-xl">✗</span>
      );
    }
    return <span className="text-zinc-300">{value}</span>;
  };

  return (
    <section className="py-20 bg-zinc-950 border-y border-zinc-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-zinc-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-zinc-800 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-zinc-900">
                <th className="text-left p-4 text-zinc-400 font-medium">{t('feature')}</th>
                <th className="p-4 text-emerald-500 font-bold bg-emerald-950/20">StencilFlow</th>
                <th className="p-4 text-zinc-400 font-medium">Ghostline</th>
                <th className="p-4 text-zinc-400 font-medium">Tattoo Stencil Pro</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={index}
                  className={`border-t border-zinc-800 ${index % 2 === 0 ? 'bg-black' : 'bg-zinc-950'}`}
                >
                  <td className="p-4 text-zinc-300 font-medium">{feature.name}</td>
                  <td className="p-4 text-center bg-emerald-950/10 font-semibold">
                    {renderCell(feature.stencilflow)}
                  </td>
                  <td className="p-4 text-center">{renderCell(feature.ghostline)}</td>
                  <td className="p-4 text-center">{renderCell(feature.tattooStencilPro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            {t('updateInfo')}
          </p>
        </div>
      </div>
    </section>
  );
}
