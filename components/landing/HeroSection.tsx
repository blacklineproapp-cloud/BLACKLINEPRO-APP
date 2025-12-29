'use client';

import { useState, useEffect } from 'react';
import { SignInButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PenTool, Sparkles, Map, Package, ChevronRight } from 'lucide-react';
import BeforeAfterSlider from './BeforeAfterSlider';

export default function HeroSection() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [activeFeature, setActiveFeature] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const features = [
    {
      title: 'Editor Profissional',
      description: 'Controle total sobre cada detalhe do seu stencil.',
      image: '/screenshots/editor-screenshot.png',
      icon: PenTool,
      color: 'text-emerald-500',
      bg: 'emerald'
    },
    {
      title: 'Gerador StencilFlow',
      description: 'Crie designs exclusivos a partir de suas ideias.',
      image: '/screenshots/generator-result.png',
      icon: Sparkles,
      color: 'text-purple-500',
      bg: 'purple'
    },
    {
      title: 'Modo Topográfico',
      description: 'Efeito de curvas de nível para sombreamentos complexos.',
      image: '/screenshots/topografico-after.png',
      beforeImage: '/screenshots/topografico.jpeg',
      afterImage: '/screenshots/topografico-after.png',
      icon: Map,
      color: 'text-blue-500',
      bg: 'blue',
      isSlider: true
    },
    {
      title: 'Linhas Perfeitas',
      description: 'Vetorização limpa para designs minimalistas e fine line.',
      image: '/screenshots/lines-after.png',
      beforeImage: '/screenshots/lines-before.png',
      afterImage: '/screenshots/lines-after.png',
      icon: PenTool,
      color: 'text-zinc-400',
      bg: 'zinc',
      isSlider: true
    }
  ];

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [features.length]);

  return (
    <section className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Gradient background with more depth */}
      <div className="absolute inset-0 bg-zinc-950" />
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/10 via-black to-purple-900/5" />
      
      {/* Animated orbs - more subtle and spread out */}
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-emerald-600/5 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-purple-600/5 blur-[120px] rounded-full animate-pulse duration-700" />

      {/* Content - Wider container for larger visual impact */}
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-5 gap-12 lg:gap-20 items-center relative z-10 py-24">
        
        {/* Texto + CTAs - Occupies 2/5 */}
        <div className="lg:col-span-2 space-y-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Tecnologia Stencil Flow & Precisão
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter">
              A Arte do  <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400">Estêncil.</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 max-w-lg leading-relaxed">
              Dê vida às suas ideias com a tecnologia mais avançada do mercado. De traços finos a sombreamentos complexos.
            </p>
          </div>

          {/* Social proof icons - stylized */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 pt-4">
            {[
              { label: 'Fidelidade Total', sub: 'Traços Nítidos' },
              { label: 'Stencil Flow', sub: 'Tecnologia Própria' },
              { label: 'Pronto para A4', sub: 'Imprima na hora' }
            ].map((item, i) => (
              <div key={i} className={`space-y-1 ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
                <div className="h-px w-8 bg-emerald-500/50 mb-3" />
                <p className="text-white font-bold text-xs md:text-sm tracking-tight">{item.label}</p>
                <p className="text-zinc-500 text-[9px] md:text-[10px] uppercase font-bold tracking-widest">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-5">
            {isMounted && (
              <>
                {isSignedIn ? (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="group bg-emerald-500 hover:bg-emerald-400 text-black px-12 py-5 rounded-[20px] text-lg font-bold transition-all shadow-xl shadow-emerald-500/20 hover:-translate-y-1 flex items-center justify-center gap-3"
                  >
                    IR PARA O PAINEL
                    <ChevronRight className="group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                  </button>
                ) : (
                  <SignInButton mode="modal">
                    <button className="group bg-emerald-500 hover:bg-emerald-400 text-black px-12 py-5 rounded-[20px] text-lg font-bold transition-all shadow-xl shadow-emerald-500/20 hover:-translate-y-1 flex items-center justify-center gap-3">
                      CRIAR CONTA
                      <ChevronRight className="group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                    </button>
                  </SignInButton>
                )}
              </>
            )}
            
            {!isMounted && (
              <div className="bg-emerald-500/50 px-12 py-5 rounded-[20px] text-lg font-bold animate-pulse w-full sm:w-[240px] text-center text-transparent">
                CARREGANDO...
              </div>
            )}

            <Link
              href="/pricing"
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-12 py-5 rounded-[20px] text-lg font-bold transition-all text-center backdrop-blur-xl shadow-xl hover:border-white/20"
            >
              PREÇOS
            </Link>
          </div>

          <div className="flex items-center gap-3 text-zinc-500">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800" />
              ))}
            </div>
            <p className="text-xs font-medium">+2.500 artistas usando hoje</p>
          </div>
        </div>

        {/* Feature Showcase - Occupies 3/5 */}
        <div className="lg:col-span-3 relative">
          
          {/* Main Showcase Window */}
          <div className="relative z-10">
            {/* Desktop Mac-Style Window Container */}
            <div className="bg-zinc-900 border border-zinc-700/50 rounded-3xl shadow-[0_0_100px_rgba(16,185,129,0.15)] overflow-hidden transition-all duration-500">
              
              {/* Window Header */}
              <div className="bg-zinc-800/50 px-3 md:px-6 py-2 md:py-4 flex items-center justify-between border-b border-zinc-700/50">
                <div className="flex gap-1.5 md:gap-2 shrink-0">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-500/50" />
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="flex-1 text-center px-4 min-w-0">
                  <div className="inline-block bg-zinc-900 px-3 md:px-4 py-1 rounded-lg text-[9px] md:text-[10px] text-zinc-500 font-mono border border-zinc-700/30 truncate max-w-[150px] md:max-w-none">
                    stencilflow.com.br / {features[activeFeature].title.toLowerCase().replace(' ', '-')}
                  </div>
                </div>
              </div>

              {/* Content Area - Responsive Sizing to avoid cropping */}
              <div className="relative aspect-[16/10] md:aspect-[16/9] w-full bg-black overflow-hidden group">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                      activeFeature === idx 
                        ? 'opacity-100 scale-100 translate-y-0' 
                        : 'opacity-0 scale-110 translate-y-12 pointer-events-none'
                    }`}
                  >
                    {feature.isSlider ? (
                      <div className="w-full h-full p-0">
                        <BeforeAfterSlider 
                          beforeImage={feature.beforeImage!} 
                          afterImage={feature.afterImage!}
                          className="!aspect-auto !border-0 !rounded-none h-full w-full"
                          beforeLabel="Original"
                          afterLabel="Stencil"
                        />
                      </div>
                    ) : (
                      <img 
                        src={feature.image} 
                        alt={feature.title}
                        className="w-full h-full object-contain md:object-cover object-top"
                      />
                    )}
                    
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Controls - Custom and Elegant */}
            <div className="absolute -bottom-6 md:-bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:gap-4 bg-zinc-900/90 backdrop-blur-2xl border border-zinc-700/50 p-2 md:p-3 rounded-full md:rounded-[24px] shadow-2xl z-20 w-[max-content] max-w-[95vw]">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveFeature(idx)}
                    className={`group relative flex items-center gap-2 md:gap-3 px-3.5 md:px-6 py-2.5 md:py-3.5 rounded-full md:rounded-2xl transition-all duration-300 ${
                      activeFeature === idx 
                        ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                        : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={activeFeature === idx ? 3 : 2} />
                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest overflow-hidden transition-all duration-500 ease-out whitespace-nowrap ${
                      activeFeature === idx ? 'max-w-[120px] opacity-100 ml-1.5 md:ml-0' : 'max-w-0 opacity-0'
                    }`}>
                      {feature.title.split(' ')[0]}
                    </span>
                    
                    {/* Progress Bar for active tab */}
                    {activeFeature === idx && (
                      <div className="absolute bottom-1 left-1.5 right-1.5 h-0.5 bg-black/20 rounded-full overflow-hidden">
                        <div className="h-full bg-black/40 w-0 animate-[progress_5s_linear_infinite]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Decorative Element - Dynamic Glow */}
          <div className={`absolute -inset-10 blur-[100px] rounded-full opacity-20 transition-all duration-1000 ${
            activeFeature === 0 ? 'bg-emerald-500' : activeFeature === 1 ? 'bg-purple-500' : 'bg-blue-500'
          }`} />
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
}