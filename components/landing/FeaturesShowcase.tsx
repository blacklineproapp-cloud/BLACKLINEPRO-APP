import { PenTool, Sparkles, Map, Package, Users } from 'lucide-react';
import Image from 'next/image';
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
                'Ajustes avançados (brilho, contraste, nitidez)',
                'Comparação antes/depois',
                'Galeria de projetos ilimitados',
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
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">Input do Usuário</span>
              </div>
              <Image 
                src="/screenshots/generator-prompt.png" 
                alt="Prompt: Jhonny bravo realista surfando"
                width={400}
                height={300}
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

        {/* Feature 3: Modo Topográfico */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative h-[500px] w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
            <BeforeAfterSlider
              beforeImage="/screenshots/topografico.jpeg"
              afterImage="/screenshots/topografico-after.jpg"
              className="aspect-[3/4]"
              beforeLabel="Original"
              afterLabel="Topográfico"
            />
          </div>
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Map className="w-6 h-6 text-indigo-400" />
              </div>
              Modo Topográfico
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Mapeie volumes e curvas com precisão milimétrica. Ideal para fechamentos e áreas complexas do corpo.
            </p>
            <ul className="space-y-3">
              {[
                'Analise a volumetria da região',
                'Curvas de nível automáticas',
                'Adaptação perfeita à anatomia',
                'Visualização 3D simulada'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 3: Linhas Perfeitas */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <PenTool className="w-6 h-6 text-purple-400" />
              </div>
              Linhas Perfeitas
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Transforme qualquer imagem em um decalque de linhas nítidas e prontas para tatuar. Esqueça o papel carbono.
            </p>
            <ul className="space-y-3">
              {[
                'Extração inteligente de linhas',
                'Controle de espessura e detalhe',
                'Limpeza automática de ruído',
                'Pronto para impressão térmica'
              ].map((item, i) => (
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
              beforeLabel="Original"
              afterLabel="Linhas"
            />
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              },
              {
                title: 'Remover Fundo',
                description: 'Remoção automática de fundo com IA avançada',
                icon: '🎭'
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

        {/* Feature 5: Organizações (Teams) - Imagem direita */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-14 h-14 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center mb-6">
              <Users className="text-indigo-500" size={28} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Trabalhe em Equipe com Organizações
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              Crie organizações para seu estúdio, adicione membros da equipe e compartilhe créditos. Perfeito para estúdios com múltiplos tatuadores trabalhando juntos.
            </p>
            <ul className="space-y-3">
              {[
                'Até 5 membros por organização',
                'Compartilhamento de créditos entre membros',
                'Gerenciamento de permissões (owner/member)',
                'Histórico centralizado de projetos',
                'Planos Studio e Enterprise disponíveis'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-zinc-300">
                  <span className="text-indigo-500 mt-1">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-indigo-900/30 to-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-8">
            {/* Placeholder visual para organizações */}
            <div className="space-y-4">
              <div className="bg-zinc-900/80 border border-indigo-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center">
                    <Users className="text-indigo-400" size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Estúdio Ink Masters</h4>
                    <p className="text-xs text-zinc-400">5 membros • Plano Studio</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {['João Silva (Owner)', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Lucas Ferreira'].map((name, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-800/50 rounded px-3 py-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-300">
                        {name[0]}
                      </div>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 text-center">
                <p className="text-sm text-zinc-400">
                  <span className="text-indigo-400 font-bold">500 créditos</span> compartilhados
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
