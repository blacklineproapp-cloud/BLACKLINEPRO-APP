import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies - StencilFlow',
  description: 'Como o StencilFlow utiliza cookies e tecnologias similares.',
};

export default function CookiesPage() {
  return (
    <div className="prose prose-invert prose-emerald max-w-none">
      <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
        Política de Cookies
      </h1>
      <p className="text-zinc-500 text-sm mb-8">
        Última atualização: {new Date().toLocaleDateString('pt-BR')}
      </p>

      <div className="space-y-8 text-zinc-300">
        {/* Introdução */}
        <section>
          <p className="text-base leading-relaxed">
            Esta Política de Cookies explica como o <strong className="text-white">StencilFlow</strong> utiliza cookies 
            e tecnologias similares para reconhecer você quando visita nossa plataforma.
          </p>
        </section>

        {/* 1. O que são Cookies */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. O que são Cookies?</h2>
          <p>
            Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. 
            Eles permitem que o site lembre suas ações e preferências ao longo do tempo.
          </p>
        </section>

        {/* 2. Tipos de Cookies */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Tipos de Cookies que Utilizamos</h2>
          
          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">2.1. Cookies Essenciais</h3>
          <p className="mb-4">
            <strong>Necessários para o funcionamento do site.</strong> Não podem ser desativados.
          </p>
          <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Autenticação (Clerk):</strong> Mantém você logado</li>
              <li><strong>Sessão:</strong> Gerencia sua sessão ativa</li>
              <li><strong>Segurança:</strong> Proteção contra CSRF e ataques</li>
              <li><strong>Preferências:</strong> Idioma, tema</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-3">Duração: Sessão ou até 1 ano</p>
          </div>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">2.2. Cookies de Analytics</h3>
          <p className="mb-4">
            <strong>Ajudam a entender como você usa o site.</strong> Podem ser desativados.
          </p>
          <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Google Analytics:</strong> Análise de tráfego e comportamento</li>
              <li><strong>Meta Pixel:</strong> Rastreamento de conversões e remarketing</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-3">Duração: Até 2 anos</p>
          </div>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">2.3. Cookies de Funcionalidade</h3>
          <p className="mb-4">
            <strong>Melhoram sua experiência.</strong> Podem ser desativados.
          </p>
          <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Preferências de UI:</strong> Tema escuro/claro, layout</li>
              <li><strong>Configurações:</strong> Últimas escolhas no editor</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-3">Duração: Até 1 ano</p>
          </div>
        </section>

        {/* 3. Cookies de Terceiros */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Cookies de Terceiros</h2>
          <p className="mb-4">Alguns cookies são definidos por serviços de terceiros:</p>
          
          <div className="space-y-4">
            <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
              <h4 className="font-semibold text-white mb-2">Clerk (Autenticação)</h4>
              <p className="text-sm">Gerencia login e sessões de usuário</p>
              <p className="text-xs text-zinc-500 mt-2">
                Política: <a href="https://clerk.com/privacy" target="_blank" rel="noopener" className="text-emerald-400 hover:underline">clerk.com/privacy</a>
              </p>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
              <h4 className="font-semibold text-white mb-2">Stripe (Pagamentos)</h4>
              <p className="text-sm">Processa pagamentos de forma segura</p>
              <p className="text-xs text-zinc-500 mt-2">
                Política: <a href="https://stripe.com/privacy" target="_blank" rel="noopener" className="text-emerald-400 hover:underline">stripe.com/privacy</a>
              </p>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
              <h4 className="font-semibold text-white mb-2">Google Analytics</h4>
              <p className="text-sm">Análise de tráfego e comportamento</p>
              <p className="text-xs text-zinc-500 mt-2">
                Política: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" className="text-emerald-400 hover:underline">policies.google.com/privacy</a>
              </p>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
              <h4 className="font-semibold text-white mb-2">Meta Pixel</h4>
              <p className="text-sm">Rastreamento de conversões e anúncios</p>
              <p className="text-xs text-zinc-500 mt-2">
                Política: <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener" className="text-emerald-400 hover:underline">facebook.com/privacy/policy</a>
              </p>
            </div>
          </div>
        </section>

        {/* 4. Como Gerenciar Cookies */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Como Gerenciar Cookies</h2>
          
          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">4.1. Configurações do Navegador</h3>
          <p className="mb-4">Você pode controlar cookies através do seu navegador:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Chrome:</strong> Configurações → Privacidade e segurança → Cookies</li>
            <li><strong>Firefox:</strong> Preferências → Privacidade e Segurança</li>
            <li><strong>Safari:</strong> Preferências → Privacidade</li>
            <li><strong>Edge:</strong> Configurações → Cookies e permissões de site</li>
          </ul>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">4.2. Banner de Consentimento</h3>
          <p>
            Ao visitar o StencilFlow pela primeira vez, você verá um banner de cookies. 
            Você pode aceitar todos, rejeitar não essenciais, ou personalizar suas preferências.
          </p>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">4.3. Opt-out de Analytics</h3>
          <p className="mb-4">Para desativar rastreamento de analytics:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Google Analytics:</strong>{' '}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener" className="text-emerald-400 hover:underline">
                Extensão de Opt-out
              </a>
            </li>
            <li>
              <strong>Meta Pixel:</strong> Configurações de anúncios do Facebook
            </li>
          </ul>

          <p className="mt-6 bg-yellow-900/20 p-4 rounded-lg border border-yellow-800">
            <strong className="text-yellow-400">Atenção:</strong> Desativar cookies pode afetar a funcionalidade do site. 
            Cookies essenciais são necessários para o funcionamento básico.
          </p>
        </section>

        {/* 5. Armazenamento Local */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Outras Tecnologias de Armazenamento</h2>
          <p className="mb-4">Além de cookies, também utilizamos:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>LocalStorage:</strong> Armazena preferências e cache de dados</li>
            <li><strong>SessionStorage:</strong> Dados temporários da sessão</li>
            <li><strong>IndexedDB:</strong> Cache de imagens e projetos para acesso offline (PWA)</li>
          </ul>
        </section>

        {/* 6. Atualizações */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Atualizações desta Política</h2>
          <p>
            Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças em nossas práticas 
            ou por razões operacionais, legais ou regulatórias.
          </p>
        </section>

        {/* 7. Contato */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Contato</h2>
          <p className="mb-4">Para questões sobre cookies:</p>
          <div className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700">
            <p><strong className="text-white">Email:</strong> <a href="mailto:contato@stencilflow.com.br" className="text-emerald-400 hover:underline">contato@stencilflow.com.br</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
