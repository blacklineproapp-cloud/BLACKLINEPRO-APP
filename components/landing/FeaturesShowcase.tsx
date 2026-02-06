import { useTranslations } from 'next-intl';
import { PenTool, Sparkles, Map, Package, Users } from 'lucide-react';
import Image from 'next/image';
import BeforeAfterSlider from './BeforeAfterSlider';

export default function FeaturesShowcase() {
  const t = useTranslations('landing.features');
  
  return (
    <section className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 space-y-32">
        {/* Feature 1: Editor de Stencil - Imagem direita */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-14 h-14 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center mb-6">
              <PenTool className="text-emerald-500" size={28} />
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
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <Image 
              src="/screenshots/editor-screenshot.png" 
              alt="Interface do Editor de Stencil StencilFlow"
              width={1200}
              height={800}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Feature 2: Geração de Designs - Imagem esquerda */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative group">
            <div className="bg-gradient-to-br from-purple-900/30 to-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <Image 
                src="/screenshots/generator-result.png" 
                alt="Johnny Bravo gerado no StencilFlow"
                width={1200}
                height={800}
                className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
              />
            </div>
            {/* Prompt Montage Overlay */}
            <div className="absolute -top-8 -left-6 md:-left-12 max-w-[280px] bg-zinc-900/90 backdrop-blur-md border border-purple-500/50 rounded-xl p-4 shadow-2xl transform hover:scale-105 transition-transform duration-300 hidden md:block z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">{t('ui.promptLabel')}</span>
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
            
            {/* Mobile Prompt Label */}
            <div className="absolute bottom-4 left-4 right-4 md:hidden bg-zinc-900/90 backdrop-blur-md border border-purple-500/50 rounded-lg p-2 text-center">
              <p className="text-xs text-purple-400 font-bold">{t('ui.promptLabel')}: {t('ui.promptExample')}</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="w-14 h-14 rounded-xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center mb-6">
              <Sparkles className="text-purple-500" size={28} />
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
                  <span className="text-purple-500 mt-1">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 3: Modo Topográfico */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative h-[500px] w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
            <BeforeAfterSlider
              beforeImage="/screenshots/topografico.jpeg"
              afterImage="/screenshots/topografico-after.jpg"
              className="aspect-[3/4]"
              beforeLabel={t('ui.original')}
              afterLabel={t('ui.topographic')}
            />
          </div>
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
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
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 4: Linhas Perfeitas */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <PenTool className="w-6 h-6 text-purple-400" />
              </div>
              {t('lines.title')}
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              {t('lines.description')}
            </p>
            <ul className="space-y-3">
              {t.raw('lines.items').map((item: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative h-[500px] w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 order-1 lg:order-2">
            <BeforeAfterSlider
              beforeImage="/screenshots/lines-before.jpg"
              afterImage="/screenshots/lines-after.png"
              className="aspect-[3/4]"
              beforeLabel={t('ui.original')}
              afterLabel={t('ui.lines')}
            />
          </div>
        </div>

        {/* Feature 5: Ferramentas Premium - Grid de ferramentas */}
        <div>
          <div className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center mx-auto mb-6">
              <Package className="text-amber-500" size={28} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              {t('tools.title')}
            </h2>
            <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
              {t('tools.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: t('tools.colorMatch.title'),
                description: t('tools.colorMatch.description'),
                icon: '🎨',
                color: 'from-pink-500/20 to-purple-500/20',
                border: 'border-pink-500/30'
              },
              {
                title: t('tools.splitA4.title'),
                description: t('tools.splitA4.description'),
                icon: '📄',
                color: 'from-blue-500/20 to-cyan-500/20',
                border: 'border-blue-500/30'
              },
              {
                title: t('tools.enhance4k.title'),
                description: t('tools.enhance4k.description'),
                icon: '✨',
                color: 'from-amber-500/20 to-orange-500/20',
                border: 'border-amber-500/30'
              },
              {
                title: t('tools.removeBg.title'),
                description: t('tools.removeBg.description'),
                icon: '🖼️',
                color: 'from-emerald-500/20 to-teal-500/20',
                border: 'border-emerald-500/30'
              }
            ].map((tool, i) => (
              <div
                key={i}
                className={`bg-gradient-to-br ${tool.color} border ${tool.border} rounded-2xl p-6 hover:scale-105 transition-transform`}
              >
                <div className="text-4xl mb-4">{tool.icon}</div>
                <h3 className="text-white font-bold text-lg mb-2">{tool.title}</h3>
                <p className="text-zinc-400 text-sm">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature 6: Organizações */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mb-6">
              <Users className="text-blue-500" size={28} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              {t('organizations.title')}
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              {t('organizations.description')}
            </p>
            <ul className="space-y-3">
              {t.raw('organizations.items').map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-zinc-300">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="text-blue-400" size={32} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">{t('organizations.example.name')}</h3>
                  <p className="text-zinc-400 text-sm">{t('organizations.example.members')} • {t('organizations.example.plan')}</p>
                </div>
              </div>
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700">
                <p className="text-zinc-300 text-sm">500 {t('organizations.example.credits')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
