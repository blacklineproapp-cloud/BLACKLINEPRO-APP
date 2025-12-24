import { PenTool, Sparkles, Map, Package } from 'lucide-react';

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
          <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900/50 border border-zinc-800 rounded-2xl p-8 aspect-square flex items-center justify-center">
            <div className="text-zinc-600 text-center">
              <PenTool className="w-24 h-24 mx-auto mb-4" />
              <p className="text-sm">Screenshot do Editor</p>
            </div>
          </div>
        </div>

        {/* Feature 2: Geração de Designs - Imagem esquerda */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 bg-gradient-to-br from-purple-900/30 to-zinc-900/50 border border-zinc-800 rounded-2xl p-8 aspect-square flex items-center justify-center">
            <div className="text-zinc-600 text-center">
              <Sparkles className="w-24 h-24 mx-auto mb-4" />
              <p className="text-sm">Geração de Designs</p>
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

        {/* Feature 3: Modos - Imagem direita */}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-900/30 to-zinc-900/50 border border-zinc-800 rounded-xl p-6 aspect-square flex items-center justify-center">
              <div className="text-zinc-600 text-center text-xs">
                <p>Topográfico</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-900/30 to-zinc-900/50 border border-zinc-800 rounded-xl p-6 aspect-square flex items-center justify-center">
              <div className="text-zinc-600 text-center text-xs">
                <p>Linhas Perfeitas</p>
              </div>
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
                description: 'Upscale inteligente mantendo qualidade',
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
