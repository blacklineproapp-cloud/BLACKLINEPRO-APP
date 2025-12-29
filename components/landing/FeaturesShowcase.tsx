import { PenTool, Sparkles, Map, Package } from 'lucide-react';
import BeforeAfterSlider from './BeforeAfterSlider';

export default function FeaturesShowcase() {
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
              Editor Completo de Stencil
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              Controle completo sobre intensidade, tamanho em centímetros e visualização. Compare antes/depois, salve projetos ilimitados e baixe em PNG de alta qualidade.
            </p>
            <ul className="space-y-3">
              {[
                'Controle de intensidade preciso',
                'Ajuste de tamanho em centímetros',
                'Comparação antes/depois',
                'Projetos ilimitados salvos',
                'Download em alta qualidade'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-zinc-300">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="/screenshots/editor-screenshot.png" 
              alt="Interface do Editor de Stencil StencilFlow"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Feature 2: Geração de Designs - Imagem esquerda */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative group">
            <div className="bg-gradient-to-br from-purple-900/30 to-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="/screenshots/generator-result.png" 
                alt="Johnny Bravo gerado no StencilFlow"
                className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
              />
            </div>
            {/* Prompt Montage Overlay */}
            <div className="absolute -top-8 -left-6 md:-left-12 max-w-[280px] bg-zinc-900/90 backdrop-blur-md border border-purple-500/50 rounded-xl p-4 shadow-2xl transform hover:scale-105 transition-transform duration-300 hidden md:block z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">Input do Usuário</span>
              </div>
              <img 
                src="/screenshots/generator-prompt.png" 
                alt="Prompt: Jhonny bravo realista surfando"
                className="rounded-lg border border-zinc-800"
              />
              <p className="mt-3 text-xs text-zinc-400 italic">
                "Jhonny bravo realista surfando"
              </p>
            </div>
            
            {/* Mobile Prompt Label */}
            <div className="absolute bottom-4 left-4 right-4 md:hidden bg-zinc-900/90 backdrop-blur-md border border-purple-500/50 rounded-lg p-2 text-center">
              <p className="text-xs text-purple-400 font-bold">Prompt: Jhonny bravo realista surfando</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="w-14 h-14 rounded-xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center mb-6">
              <Sparkles className="text-purple-500" size={28} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Crie Designs de Tatuagem do Zero
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              Descreva sua ideia em palavras e nossa tecnologia avançada cria o design. Perfeito para quando o cliente tem a ideia mas não a imagem.
            </p>
            <ul className="space-y-3">
              {[
                'Tecnologia Stencil Flow avançada',
                'Descrições inteligentes',
                'Múltiplas variações',
                'Alta qualidade de saída',
                'Do zero ao design em segundos'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-zinc-300">
                  <span className="text-purple-500 mt-1">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 3: Modos - DOIS SLIDERS LADO A LADO */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mb-6">
              <Map className="text-blue-500" size={28} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Dois Estilos, Infinitas Possibilidades
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              <strong className="text-white">Modo Topográfico:</strong> Cria efeito de mapa topográfico com curvas de nível. Ideal para sombreamentos complexos e efeitos 3D.
              <br /><br />
              <strong className="text-white">Modo Linhas Perfeitas:</strong> Vetoriza a imagem em linhas limpas e precisas. Perfeito para tattoos minimalistas e designs line work.
            </p>
            <ul className="space-y-3">
              {[
                'Vetorização inteligente',
                'Linhas suaves e precisas',
                'Efeitos topográficos 3D',
                'Pronto para tatuar',
                'Ajuste fino de parâmetros'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-zinc-300">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Comparações Interativas Antes/Depois - DOIS MODOS */}
          <div className="space-y-6">
            {/* Modo Topográfico */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Modo Topográfico
              </h3>
              <BeforeAfterSlider
                beforeImage="/screenshots/topografico.jpeg"
                afterImage="/screenshots/topografico-after.png"
                beforeLabel="Original"
                afterLabel="Topográfico"
              />
            </div>

            {/* Modo Linhas Perfeitas */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Modo Linhas Perfeitas
              </h3>
              <BeforeAfterSlider
                beforeImage="/screenshots/lines-before.png"
                afterImage="/screenshots/lines-after.png"
                beforeLabel="Original"
                afterLabel="Linhas"
              />
            </div>
          </div>
        </div>

        {/* Feature 4: Ferramentas Premium - Grid de ferramentas */}
        <div>
          <div className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center mx-auto mb-6">
              <Package className="text-amber-500" size={28} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ferramentas Profissionais para Tatuadores Profissionais
            </h2>
            <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
              Desbloqueie ferramentas premium que vão acelerar seu trabalho e impressionar seus clientes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Color Match',
                description: 'Identifica cores e sugere tintas compatíveis',
                icon: '🎨'
              },
              {
                title: 'Dividir em A4',
                description: 'Divide designs grandes em múltiplas folhas',
                icon: '📄'
              },
              {
                title: 'Aprimorar 4K',
                description: 'Aprimoramento inteligente mantendo qualidade',
                icon: '✨'
              }
            ].map((tool, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-amber-900/20 to-zinc-900 border border-zinc-800 rounded-xl p-6 text-center hover:border-amber-500/30 transition-all"
              >
                <div className="text-4xl mb-4">{tool.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{tool.title}</h3>
                <p className="text-sm text-zinc-400">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
