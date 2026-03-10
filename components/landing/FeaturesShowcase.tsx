import { useTranslations } from 'next-intl';
import { PenTool, Sparkles, Map, Palette, Layout, Wand2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import BeforeAfterSlider from './BeforeAfterSlider';

export default function FeaturesShowcase() {
  const t = useTranslations('landing.features');

  return (
    <section className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 space-y-24">
        {/* Feature 1: Stencil Editor */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
              <PenTool className="text-indigo-400" size={28} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              {t('editor.title')}
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              {t('editor.description')}
            </p>
            <ul className="space-y-3">
              {t.raw('editor.items').map((feature: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-zinc-300">
                  <span className="text-indigo-400 mt-1">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-indigo-900/20 to-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/screenshots/editor-screenshot.png"
              alt="Interface do Editor de Stencil Black Line Pro"
              width={1200}
              height={800}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Feature 2: AI Generator */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative group">
            <div className="bg-gradient-to-br from-indigo-900/20 to-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/screenshots/generator-result.png"
                alt="Stencil gerado por IA no Black Line Pro"
                width={1200}
                height={800}
                className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
              />
            </div>
            {/* Prompt overlay */}
            <div className="absolute -top-8 -left-6 md:-left-12 max-w-[280px] bg-zinc-900/90 backdrop-blur-md border border-indigo-500/40 rounded-xl p-4 shadow-2xl transform hover:scale-105 transition-transform duration-300 hidden md:block z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">{t('ui.promptLabel')}</span>
              </div>
              <Image
                src="/screenshots/generator-prompt.png"
                alt={`${t('ui.promptLabel')}: ${t('ui.promptExample')}`}
                width={400}
                height={300}
                className="rounded-lg border border-zinc-800"
              />
              <p className="mt-3 text-xs text-zinc-400 italic">
                "{t('ui.promptExample')}"
              </p>
            </div>
            <div className="absolute bottom-4 left-4 right-4 md:hidden bg-zinc-900/90 backdrop-blur-md border border-indigo-500/40 rounded-lg p-2 text-center">
              <p className="text-xs text-indigo-400 font-bold">{t('ui.promptLabel')}: {t('ui.promptExample')}</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
              <Sparkles className="text-indigo-400" size={28} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              {t('generator.title')}
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              {t('generator.description')}
            </p>
            <ul className="space-y-3">
              {t.raw('generator.items').map((feature: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-zinc-300">
                  <span className="text-indigo-400 mt-1">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 3: Topographic Mode */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative h-[400px] md:h-[500px] w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
            <BeforeAfterSlider
              beforeImage="/screenshots/topografico.jpeg"
              afterImage="/screenshots/topografico-after.jpg"
              className="aspect-[3/4]"
              beforeLabel={t('ui.original')}
              afterLabel={t('ui.topographic')}
              tooltip={t('ui.dragToCompare')}
            />
          </div>
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Map className="w-6 h-6 text-indigo-400" />
              </div>
              {t('topographic.title')}
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              {t('topographic.description')}
            </p>
            <ul className="space-y-3">
              {t.raw('topographic.items').map((item: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 4: Perfect Lines */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <PenTool className="w-6 h-6 text-indigo-400" />
              </div>
              {t('lines.title')}
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              {t('lines.description')}
            </p>
            <ul className="space-y-3">
              {t.raw('lines.items').map((item: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative h-[400px] md:h-[500px] w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 order-1 lg:order-2">
            <BeforeAfterSlider
              beforeImage="/screenshots/lines-before.jpg"
              afterImage="/screenshots/lines-after.png"
              className="aspect-[3/4]"
              beforeLabel={t('ui.original')}
              afterLabel={t('ui.lines')}
              tooltip={t('ui.dragToCompare')}
            />
          </div>
        </div>

        {/* Feature 5: Premium Tools Grid */}
        <div>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              {t('tools.title')}
            </h2>
            <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
              {t('tools.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: t('tools.colorMatch.title'), description: t('tools.colorMatch.description'), icon: Palette },
              { title: t('tools.splitA4.title'), description: t('tools.splitA4.description'), icon: Layout },
              { title: t('tools.enhance4k.title'), description: t('tools.enhance4k.description'), icon: Wand2 },
              { title: t('tools.removeBg.title'), description: t('tools.removeBg.description'), icon: ImageIcon },
            ].map(({ title, description, icon: Icon }, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 rounded-2xl p-6 hover:bg-indigo-950/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/15 transition-colors">
                  <Icon className="text-indigo-400" size={24} />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
