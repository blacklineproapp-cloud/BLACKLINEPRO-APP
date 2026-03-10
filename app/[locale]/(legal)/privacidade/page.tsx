import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Política de Privacidade - Black Line Pro',
  description: 'Política de Privacidade do Black Line Pro - Como coletamos, usamos e protegemos seus dados pessoais.',
};

export default function PrivacidadePage() {
  return (
    <div className="prose prose-invert prose-indigo max-w-none">
      <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
        Política de Privacidade
      </h1>
      <p className="text-zinc-500 text-sm mb-8">
        Última atualização: {new Date().toLocaleDateString('pt-BR')}
      </p>

      <div className="space-y-8 text-zinc-300">
        {/* Introdução */}
        <section>
          <p className="text-base leading-relaxed">
            A <strong className="text-white">Black Line Pro</strong> ("nós", "nosso" ou "nossa") está comprometida em proteger sua privacidade. 
            Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações pessoais quando você usa nossa plataforma.
          </p>
          <p className="text-base leading-relaxed mt-4">
            Ao usar o Black Line Pro, você concorda com a coleta e uso de informações de acordo com esta política.
          </p>
        </section>

        {/* 1. Dados Coletados */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Dados Coletados</h2>
          
          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">1.1. Dados Fornecidos por Você</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Informações de Conta:</strong> Nome, email, senha (criptografada)</li>
            <li><strong>Informações de Pagamento:</strong> Processadas via Stripe (não armazenamos dados de cartão)</li>
            <li><strong>Conteúdo do Usuário:</strong> Imagens enviadas para processamento de stencils</li>
            <li><strong>Comunicações:</strong> Mensagens de suporte, feedback</li>
          </ul>

          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">1.2. Dados Coletados Automaticamente</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Dados de Uso:</strong> Páginas visitadas, recursos utilizados, tempo de sessão</li>
            <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, sistema operacional, dispositivo</li>
            <li><strong>Cookies e Tecnologias Similares:</strong> Para autenticação, preferências e analytics</li>
            <li><strong>Logs de Erro:</strong> Via Sentry para diagnóstico e melhorias</li>
          </ul>
        </section>

        {/* 2. Finalidade do Uso */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Finalidade do Uso dos Dados</h2>
          <p className="mb-4">Utilizamos seus dados pessoais para:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Prestação do Serviço:</strong> Processar imagens, gerar stencils, gerenciar sua conta</li>
            <li><strong>Processamento de Pagamentos:</strong> Gerenciar assinaturas e cobranças via Stripe</li>
            <li><strong>Comunicação:</strong> Enviar notificações importantes, atualizações, suporte</li>
            <li><strong>Melhorias:</strong> Analisar uso para aprimorar funcionalidades e experiência</li>
            <li><strong>Segurança:</strong> Detectar e prevenir fraudes, abusos e violações</li>
            <li><strong>Compliance:</strong> Cumprir obrigações legais e regulatórias</li>
          </ul>
        </section>

        {/* 3. Compartilhamento de Dados */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Compartilhamento de Dados</h2>
          <p className="mb-4">Compartilhamos seus dados apenas com:</p>
          
          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">3.1. Provedores de Serviço</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Clerk:</strong> Autenticação e gerenciamento de usuários</li>
            <li><strong>Stripe:</strong> Processamento de pagamentos</li>
            <li><strong>Supabase:</strong> Armazenamento de dados e imagens</li>
            <li><strong>Google (Gemini AI):</strong> Processamento de imagens com IA</li>
            <li><strong>Sentry:</strong> Monitoramento de erros</li>
            <li><strong>Railway:</strong> Infraestrutura e cache (Redis)</li>
          </ul>

          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">3.2. Requisitos Legais</h3>
          <p>Podemos divulgar seus dados se exigido por lei ou para:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Cumprir obrigações legais</li>
            <li>Proteger direitos e segurança da Black Line Pro</li>
            <li>Prevenir fraudes ou investigar violações</li>
          </ul>

          <p className="mt-4 text-sm bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
            <strong>Importante:</strong> Nunca vendemos seus dados pessoais a terceiros.
          </p>
        </section>

        {/* 4. Seus Direitos (LGPD) */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Seus Direitos (LGPD)</h2>
          <p className="mb-4">De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Acesso:</strong> Confirmar se processamos seus dados e solicitar cópia</li>
            <li><strong>Correção:</strong> Atualizar dados incompletos, inexatos ou desatualizados</li>
            <li><strong>Exclusão:</strong> Solicitar eliminação de dados (direito ao esquecimento)</li>
            <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
            <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
            <li><strong>Oposição:</strong> Opor-se ao tratamento de dados em certas situações</li>
            <li><strong>Informação:</strong> Saber com quem compartilhamos seus dados</li>
          </ul>

          <p className="mt-6 bg-indigo-900/20 p-4 rounded-lg border border-indigo-800">
            <strong className="text-indigo-400">Como exercer seus direitos:</strong><br />
            Entre em contato conosco através do email: <a href="mailto:privacidade@blacklinepro.com.br" className="text-indigo-400 hover:underline">privacidade@blacklinepro.com.br</a>
          </p>
        </section>

        {/* 5. Segurança */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Segurança dos Dados</h2>
          <p className="mb-4">Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Criptografia:</strong> HTTPS (TLS 1.3) para dados em trânsito</li>
            <li><strong>Armazenamento Seguro:</strong> Dados criptografados em repouso no Supabase</li>
            <li><strong>Controle de Acesso:</strong> Autenticação robusta e permissões baseadas em função</li>
            <li><strong>Monitoramento:</strong> Logs de segurança e detecção de anomalias</li>
            <li><strong>Backups:</strong> Backups regulares e seguros</li>
            <li><strong>Auditorias:</strong> Revisões periódicas de segurança</li>
          </ul>
        </section>

        {/* 6. Retenção de Dados */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Retenção de Dados</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Dados de Conta:</strong> Mantidos enquanto sua conta estiver ativa ou conforme necessário para prestar serviços</li>
            <li><strong>Imagens Enviadas:</strong> Armazenadas até você excluí-las manualmente</li>
            <li><strong>Logs de Sistema:</strong> Retidos por até 90 dias</li>
            <li><strong>Dados de Pagamento:</strong> Conforme exigido por lei (geralmente 5 anos)</li>
            <li><strong>Backups:</strong> Mantidos por até 30 dias</li>
          </ul>
          <p className="mt-4">Após a exclusão da conta, seus dados são removidos permanentemente em até 30 dias.</p>
        </section>

        {/* 7. Cookies */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Cookies e Tecnologias Similares</h2>
          <p className="mb-4">Utilizamos cookies para:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Essenciais:</strong> Autenticação, segurança, funcionalidade básica</li>
            <li><strong>Analytics:</strong> Google Analytics, Meta Pixel (com seu consentimento)</li>
            <li><strong>Preferências:</strong> Idioma, tema, configurações</li>
          </ul>
          <p className="mt-4">
            Você pode gerenciar cookies nas configurações do seu navegador. 
            Consulte nossa <Link href="/cookies" className="text-indigo-400 hover:underline">Política de Cookies</Link> para mais detalhes.
          </p>
        </section>

        {/* 8. Transferência Internacional */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Transferência Internacional de Dados</h2>
          <p>
            Alguns de nossos provedores de serviço estão localizados fora do Brasil (EUA, Europa). 
            Garantimos que essas transferências sejam realizadas com salvaguardas adequadas, incluindo:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
            <li>Cláusulas contratuais padrão aprovadas</li>
            <li>Certificações de privacidade (ex: Privacy Shield)</li>
            <li>Conformidade com LGPD e GDPR</li>
          </ul>
        </section>

        {/* 9. Menores de Idade */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. Menores de Idade</h2>
          <p>
            O Black Line Pro não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores. 
            Se você é pai/mãe ou responsável e acredita que seu filho forneceu dados, entre em contato conosco para remoção.
          </p>
        </section>

        {/* 10. Alterações */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">10. Alterações nesta Política</h2>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas por email 
            ou através de aviso em nossa plataforma. A data da "Última atualização" no topo indica quando a política foi revisada.
          </p>
          <p className="mt-4">
            Recomendamos revisar esta política regularmente para se manter informado sobre como protegemos seus dados.
          </p>
        </section>

        {/* 11. Contato */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">11. Contato</h2>
          <p className="mb-4">Para questões sobre esta Política de Privacidade ou exercer seus direitos, entre em contato:</p>
          <div className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700">
            <p><strong className="text-white">Email:</strong> <a href="mailto:contato@blacklinepro.com.br" className="text-indigo-400 hover:underline">contato@blacklinepro.com.br</a></p>
            <p className="mt-2"><strong className="text-white">Suporte Geral:</strong> <a href="mailto:contato@blacklinepro.com.br" className="text-indigo-400 hover:underline">contato@blacklinepro.com.br</a></p>
            <p className="mt-4 text-sm text-zinc-500">Responderemos sua solicitação em até 15 dias úteis.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
