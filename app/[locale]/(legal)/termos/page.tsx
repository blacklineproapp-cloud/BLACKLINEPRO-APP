import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Termos de Uso - StencilFlow',
  description: 'Termos e Condições de Uso do StencilFlow - Direitos, responsabilidades e regras de utilização.',
};

export default function TermosPage() {
  return (
    <div className="prose prose-invert prose-emerald max-w-none">
      <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
        Termos de Uso
      </h1>
      <p className="text-zinc-500 text-sm mb-8">
        Última atualização: {new Date().toLocaleDateString('pt-BR')}
      </p>

      <div className="space-y-8 text-zinc-300">
        {/* Introdução */}
        <section>
          <p className="text-base leading-relaxed">
            Bem-vindo ao <strong className="text-white">StencilFlow</strong>. Ao acessar e usar nossa plataforma, você concorda em cumprir 
            e estar vinculado aos seguintes Termos de Uso. Se você não concorda com estes termos, não use nossos serviços.
          </p>
        </section>

        {/* 1. Aceitação */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Aceitação dos Termos</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Ao criar uma conta ou usar o StencilFlow, você aceita estes Termos de Uso</li>
            <li>Você deve ter pelo menos 18 anos de idade</li>
            <li>Você deve ter capacidade legal para celebrar contratos</li>
            <li>Se usar em nome de uma empresa, você declara ter autoridade para vinculá-la</li>
          </ul>
        </section>

        {/* 2. Descrição do Serviço */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Descrição do Serviço</h2>
          <p className="mb-4">O StencilFlow é uma plataforma SaaS que oferece:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Editor de Stencils:</strong> Conversão de imagens em stencils de tatuagem profissionais</li>
            <li><strong>Modos de Geração:</strong> Topográfico, Linhas Perfeitas, Padrão</li>
            <li><strong>Ferramentas Premium:</strong> Color Match, Dividir A4, Aprimorar 4K, Remover Fundo</li>
            <li><strong>Geração com IA:</strong> Criação de designs usando inteligência artificial</li>
            <li><strong>Armazenamento:</strong> Galeria de projetos salvos</li>
          </ul>
          
          <p className="mt-4 text-sm bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
            <strong>Limitações:</strong> O serviço está sujeito a limitações técnicas, disponibilidade de servidores e 
            limites de uso conforme seu plano de assinatura.
          </p>
        </section>

        {/* 3. Conta de Usuário */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Conta de Usuário</h2>
          
          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">3.1. Criação de Conta</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Você deve fornecer informações precisas e completas</li>
            <li>Você é responsável por manter a confidencialidade de sua senha</li>
            <li>Você é responsável por todas as atividades em sua conta</li>
            <li>Notifique-nos imediatamente sobre qualquer uso não autorizado</li>
          </ul>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">3.2. Proibições</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Compartilhar credenciais de acesso</li>
            <li>Criar múltiplas contas para contornar limites</li>
            <li>Usar contas de terceiros sem permissão</li>
            <li>Vender ou transferir sua conta</li>
          </ul>
        </section>

        {/* 4. Uso Aceitável */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Uso Aceitável</h2>
          
          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">4.1. Você PODE:</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Usar o serviço para fins profissionais e comerciais legítimos</li>
            <li>Criar e salvar stencils de tatuagem</li>
            <li>Baixar e usar seus projetos criados</li>
            <li>Compartilhar resultados com clientes (tatuadores)</li>
          </ul>

          <h3 className="text-xl font-semibold text-red-400 mt-6 mb-3">4.2. Você NÃO PODE:</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Conteúdo Ilegal:</strong> Enviar imagens ilegais, ofensivas, pornográficas ou que violem direitos de terceiros</li>
            <li><strong>Violação de Direitos Autorais:</strong> Usar imagens sem permissão do detentor dos direitos</li>
            <li><strong>Abuso do Sistema:</strong> Fazer scraping, automação não autorizada, ou sobrecarregar servidores</li>
            <li><strong>Engenharia Reversa:</strong> Tentar acessar código-fonte, APIs privadas ou descompilar o software</li>
            <li><strong>Revenda:</strong> Revender acesso ao serviço sem autorização expressa</li>
            <li><strong>Fraude:</strong> Usar cartões de crédito roubados ou realizar chargebacks fraudulentos</li>
          </ul>

          <p className="mt-4 bg-red-900/20 p-4 rounded-lg border border-red-800">
            <strong className="text-red-400">Violações podem resultar em:</strong> Suspensão imediata da conta, 
            exclusão de dados, e ações legais quando aplicável.
          </p>
        </section>

        {/* 5. Propriedade Intelectual */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Propriedade Intelectual</h2>
          
          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">5.1. Nossa Propriedade</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>O StencilFlow, incluindo código, design, marca e conteúdo, é de nossa propriedade</li>
            <li>Você recebe apenas uma licença limitada e não exclusiva para usar o serviço</li>
            <li>Não adquire nenhum direito de propriedade sobre a plataforma</li>
          </ul>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">5.2. Seu Conteúdo</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Você mantém todos os direitos</strong> sobre as imagens que envia</li>
            <li>Você nos concede uma <strong>licença limitada</strong> para processar e armazenar suas imagens</li>
            <li>Esta licença termina quando você exclui o conteúdo</li>
            <li>Você é responsável por garantir que tem direitos sobre as imagens enviadas</li>
          </ul>
        </section>

        {/* 6. Pagamentos e Assinaturas */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Pagamentos e Assinaturas</h2>
          
          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">6.1. Planos</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Free:</strong> Acesso limitado com créditos mensais</li>
            <li><strong>Starter:</strong> Plano básico com mais créditos</li>
            <li><strong>Pro:</strong> Plano profissional com créditos expandidos</li>
            <li><strong>Studio:</strong> Plano ilimitado para estúdios</li>
          </ul>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">6.2. Cobrança</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Assinaturas são cobradas mensalmente ou anualmente via Stripe</li>
            <li>Renovação automática, salvo cancelamento</li>
            <li>Preços podem mudar com aviso prévio de 30 dias</li>
            <li>Você é responsável por manter informações de pagamento atualizadas</li>
          </ul>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">6.3. Cancelamento</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Você pode cancelar a qualquer momento</li>
            <li>Acesso continua até o fim do período pago</li>
            <li>Sem reembolso proporcional (exceto conforme Política de Reembolso)</li>
          </ul>

          <p className="mt-4">
            Consulte nossa <Link href="/reembolso" className="text-emerald-400 hover:underline">Política de Reembolso</Link> para detalhes.
          </p>
        </section>

        {/* 7. Limitação de Responsabilidade */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Limitação de Responsabilidade</h2>
          
          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">7.1. Serviço "As Is"</h3>
          <p>
            O StencilFlow é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, 
            expressas ou implícitas, incluindo, mas não se limitando a:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
            <li>Disponibilidade ininterrupta ou livre de erros</li>
            <li>Precisão ou qualidade dos resultados</li>
            <li>Adequação a um propósito específico</li>
          </ul>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">7.2. Exclusão de Danos</h3>
          <p>
            Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais, especiais, 
            consequenciais ou punitivos, incluindo:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
            <li>Perda de lucros ou receitas</li>
            <li>Perda de dados ou conteúdo</li>
            <li>Interrupção de negócios</li>
            <li>Custos de substituição de serviços</li>
          </ul>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">7.3. Limite de Responsabilidade</h3>
          <p>
            Nossa responsabilidade total não excederá o valor pago por você nos últimos 12 meses.
          </p>
        </section>

        {/* 8. Modificações */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Modificações do Serviço e Termos</h2>
          
          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">8.1. Alterações no Serviço</h3>
          <p>Reservamos o direito de:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
            <li>Modificar ou descontinuar recursos</li>
            <li>Alterar limites de uso</li>
            <li>Atualizar tecnologias e integrações</li>
          </ul>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">8.2. Alterações nos Termos</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Podemos atualizar estes Termos periodicamente</li>
            <li>Notificaremos sobre mudanças significativas com 30 dias de antecedência</li>
            <li>Uso continuado após mudanças constitui aceitação</li>
          </ul>
        </section>

        {/* 9. Rescisão */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. Rescisão</h2>
          
          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">9.1. Por Você</h3>
          <p>Você pode encerrar sua conta a qualquer momento através das configurações ou entrando em contato conosco.</p>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">9.2. Por Nós</h3>
          <p>Podemos suspender ou encerrar sua conta imediatamente se:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
            <li>Você violar estes Termos</li>
            <li>Houver atividade fraudulenta ou ilegal</li>
            <li>Seu pagamento falhar repetidamente</li>
            <li>Por razões legais ou regulatórias</li>
          </ul>

          <h3 className="text-xl font-semibold text-emerald-400 mt-6 mb-3">9.3. Efeitos da Rescisão</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Acesso ao serviço é imediatamente revogado</li>
            <li>Seus dados podem ser excluídos após 30 dias</li>
            <li>Você pode solicitar exportação de dados antes da exclusão</li>
          </ul>
        </section>

        {/* 10. Lei Aplicável */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">10. Lei Aplicável e Jurisdição</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. 
            Quaisquer disputas serão resolvidas nos tribunais competentes do Brasil.
          </p>
        </section>

        {/* 11. Disposições Gerais */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">11. Disposições Gerais</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Acordo Integral:</strong> Estes Termos constituem o acordo completo entre você e o StencilFlow</li>
            <li><strong>Renúncia:</strong> Nossa falha em fazer cumprir qualquer direito não constitui renúncia</li>
            <li><strong>Divisibilidade:</strong> Se alguma cláusula for inválida, as demais permanecem em vigor</li>
            <li><strong>Cessão:</strong> Você não pode transferir seus direitos sem nosso consentimento</li>
          </ul>
        </section>

        {/* 12. Contato */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">12. Contato</h2>
          <p className="mb-4">Para questões sobre estes Termos de Uso:</p>
          <div className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700">
            <p><strong className="text-white">Email:</strong> <a href="mailto:contato@stencilflow.com.br" className="text-emerald-400 hover:underline">suporte@stencilflow.com.br</a></p>
            <p className="mt-2"><strong className="text-white">Jurídico:</strong> <a href="mailto:contato@stencilflow.com.br" className="text-emerald-400 hover:underline">contato@stencilflow.com.br</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
