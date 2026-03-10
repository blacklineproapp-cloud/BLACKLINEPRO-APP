import { useTranslations } from 'next-intl';

export default function ComparisonTable() {
  const t = useTranslations('landing.comparison');

  const features = [
    { name: t('features.editor'),      blp: t('full'),             ghostline: t('basic'), tattooStencilPro: t('limited') },
    { name: t('features.designGen'),   blp: 'Black Line Pro Tech', ghostline: false,      tattooStencilPro: false },
    { name: t('features.topographic'), blp: true,                  ghostline: false,      tattooStencilPro: true },
    { name: t('features.lines'),       blp: true,                  ghostline: true,       tattooStencilPro: false },
    { name: t('features.size'),        blp: true,                  ghostline: false,      tattooStencilPro: true },
    { name: t('features.colorMatch'),  blp: true,                  ghostline: false,      tattooStencilPro: false },
    { name: t('features.splitA4'),     blp: true,                  ghostline: false,      tattooStencilPro: false },
    { name: t('features.enhance4k'),   blp: true,                  ghostline: false,      tattooStencilPro: false },
    { name: t('features.price'),       blp: t('priceStarting'),    ghostline: 'R$ 97+',   tattooStencilPro: 'R$ 145+' },
    { name: t('features.free'),        blp: false,                 ghostline: false,      tattooStencilPro: false },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-indigo-400 text-xl">✓</span>
      ) : (
        <span className="text-zinc-600 text-xl">✗</span>
      );
    }
    return <span className="text-zinc-300 text-sm">{value}</span>;
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

        {/* Mobile: Card layout */}
        <div className="md:hidden space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4"
            >
              <p className="text-white font-semibold text-sm mb-3">{feature.name}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-[10px] text-indigo-400 font-bold mb-1">BLP</p>
                  <div className="bg-indigo-950/20 rounded-lg py-2">
                    {renderCell(feature.blp)}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 font-medium mb-1">Ghostline</p>
                  <div className="bg-zinc-950 rounded-lg py-2">
                    {renderCell(feature.ghostline)}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 font-medium mb-1">TSP</p>
                  <div className="bg-zinc-950 rounded-lg py-2">
                    {renderCell(feature.tattooStencilPro)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table layout */}
        <div className="hidden md:block">
          <table className="w-full border border-zinc-800 rounded-2xl overflow-hidden">
            <thead>
              <tr className="bg-zinc-900">
                <th scope="col" className="text-left p-4 text-zinc-400 font-medium">{t('feature')}</th>
                <th scope="col" className="p-4 text-indigo-400 font-bold bg-indigo-950/20">Black Line Pro</th>
                <th scope="col" className="p-4 text-zinc-400 font-medium">Ghostline</th>
                <th scope="col" className="p-4 text-zinc-400 font-medium">Tattoo Stencil Pro</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={index}
                  className={`border-t border-zinc-800 hover:bg-zinc-900/50 transition-colors ${index % 2 === 0 ? 'bg-black' : 'bg-zinc-950'}`}
                >
                  <td className="p-4 text-zinc-300 font-medium">{feature.name}</td>
                  <td className="p-4 text-center bg-indigo-950/10 font-semibold">
                    {renderCell(feature.blp)}
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
