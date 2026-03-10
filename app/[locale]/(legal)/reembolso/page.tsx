import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Reembolso - Black Line Pro',
  description: 'Política de reembolso e cancelamento do Black Line Pro.',
};

export default function ReembolsoPage() {
  return (
    <div className="prose prose-invert prose-indigo max-w-none">
      <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
        Política de Reembolso
      </h1>
      <p className="text-zinc-500 text-sm mb-8">
        Última atualização: {new Date().toLocaleDateString('pt-BR')}
      </p>

      <div className="space-y-8 text-zinc-300">
        {/* Introdução */}
        <section>
          <p className="text-base leading-relaxed">
            No <strong className="text-white">Black Line Pro</strong>, queremos que você esteja completamente satisfeito com nosso serviço. 
            Esta política descreve nossas diretrizes de reembolso e cancelamento.
          </p>
        </section>

        {/* 1. Garantia de Satisfação */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Garantia de 7 Dias</h2>
          <div className="bg-indigo-900/20 p-6 rounded-lg border border-indigo-800">
            <p className="text-lg font-semibold text-indigo-400 mb-3">
              ✓ Reembolso Total - Sem Perguntas
            </p>
            <p>
              Se você não estiver satisfeito com o Black Line Pro nos primeiros <strong>7 dias</strong> após a assinatura, 
              oferecemos reembolso total do valor pago.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">1.1. Condições</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Solicitação dentro de 7 dias corridos da data de pagamento</li>
            <li>Aplicável apenas à primeira assinatura (novos clientes)</li>
            <li>Não se aplica a renovações ou upgrades de plano</li>
          </ul>

          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">1.2. Como Solicitar</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Envie email para <a href="mailto:contato@blacklinepro.com.br" className="text-indigo-400 hover:underline">contato@blacklinepro.com.br</a></li>
            <li>Assunto: "Solicitação de Reembolso"</li>
            <li>Inclua: email da conta e motivo (opcional)</li>
            <li>Processaremos em até 5 dias úteis</li>
          </ol>
        </section>

        {/* 2. Após 7 Dias */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Reembolsos Após 7 Dias</h2>
          <p className="mb-4">
            Após o período de garantia, reembolsos são avaliados caso a caso nas seguintes situações:
          </p>

          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">2.1. Situações Elegíveis</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Cobrança Duplicada:</strong> Reembolso total do valor duplicado</li>
            <li><strong>Problemas Técnicos:</strong> Falhas graves não resolvidas em tempo hábil</li>
            <li><strong>Cobrança Indevida:</strong> Erro no processamento de pagamento</li>
            <li><strong>Cancelamento Não Processado:</strong> Cobrança após cancelamento confirmado</li>
          </ul>

          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">2.2. Reembolso Proporcional</h3>
          <p>
            Em casos excepcionais, podemos oferecer reembolso proporcional baseado no tempo não utilizado do período pago. 
            Isso é avaliado individualmente.
          </p>

          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">2.3. Situações NÃO Elegíveis</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Mudança de ideia após 7 dias</li>
            <li>Falta de uso do serviço</li>
            <li>Violação dos Termos de Uso</li>
            <li>Suspensão por fraude ou abuso</li>
          </ul>
        </section>

        {/* 3. Cancelamento */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Cancelamento de Assinatura</h2>
          
          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">3.1. Como Cancelar</h3>
          <p className="mb-4">Você pode cancelar sua assinatura a qualquer momento:</p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Acesse <strong>Dashboard → Configurações → Assinatura</strong></li>
            <li>Clique em "Cancelar Assinatura"</li>
            <li>Confirme o cancelamento</li>
          </ol>
          <p className="mt-4 text-sm">
            Ou envie email para <a href="mailto:contato@blacklinepro.com.br" className="text-indigo-400 hover:underline">contato@blacklinepro.com.br</a>
          </p>

          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">3.2. Efeitos do Cancelamento</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Acesso Mantido:</strong> Você continua com acesso até o fim do período pago</li>
            <li><strong>Sem Renovação:</strong> Não haverá cobrança no próximo ciclo</li>
            <li><strong>Sem Reembolso:</strong> Não há reembolso proporcional (exceto período de garantia)</li>
            <li><strong>Dados Preservados:</strong> Seus projetos ficam salvos por 30 dias após expiração</li>
          </ul>

          <div className="mt-6 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
            <p className="text-sm">
              <strong>Exemplo:</strong> Se você pagar em 01/01 e cancelar em 15/01, continuará com acesso até 31/01 (ou 01/02 do ano seguinte, se anual).
            </p>
          </div>
        </section>

        {/* 4. Downgrades */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Mudança de Plano (Downgrade)</h2>
          <p className="mb-4">
            Você pode fazer downgrade para um plano inferior a qualquer momento:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>O novo plano entra em vigor no próximo ciclo de cobrança</li>
            <li>Você mantém benefícios do plano atual até o fim do período pago</li>
            <li>Não há reembolso da diferença de preço</li>
          </ul>
        </section>

        {/* 5. Upgrades */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Mudança de Plano (Upgrade)</h2>
          <p className="mb-4">
            Ao fazer upgrade para um plano superior:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Imediato:</strong> Acesso aos novos recursos é instantâneo</li>
            <li><strong>Cobrança Proporcional:</strong> Você paga apenas a diferença proporcional ao tempo restante</li>
            <li><strong>Novo Ciclo:</strong> Seu ciclo de cobrança é ajustado</li>
          </ul>
        </section>

        {/* 6. Processamento */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Processamento de Reembolsos</h2>
          
          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">6.1. Prazos</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Análise:</strong> Até 5 dias úteis para avaliar solicitação</li>
            <li><strong>Aprovação:</strong> Notificação por email</li>
            <li><strong>Estorno:</strong> Até 10 dias úteis após aprovação</li>
            <li><strong>Banco:</strong> Pode levar até 2 ciclos de fatura para aparecer</li>
          </ul>

          <h3 className="text-xl font-semibold text-indigo-400 mt-6 mb-3">6.2. Método de Reembolso</h3>
          <p>
            Reembolsos são processados através do mesmo método de pagamento original (cartão de crédito via Stripe). 
            Não oferecemos reembolsos em dinheiro ou transferência bancária.
          </p>
        </section>

        {/* 7. Plano Free */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Plano Gratuito (Free)</h2>
          <p>
            O plano Free não envolve pagamento, portanto não há reembolsos aplicáveis. 
            Você pode cancelar ou excluir sua conta a qualquer momento sem custos.
          </p>
        </section>

        {/* 8. Exceções */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Exceções e Casos Especiais</h2>
          <p className="mb-4">
            Reservamos o direito de fazer exceções a esta política em circunstâncias extraordinárias, 
            a nosso exclusivo critério. Casos especiais serão avaliados individualmente.
          </p>
        </section>

        {/* 9. Contato */}
        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. Contato</h2>
          <p className="mb-4">Para solicitar reembolso ou tirar dúvidas:</p>
          <div className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700">
            <p><strong className="text-white">Email:</strong> <a href="mailto:contato@blacklinepro.com.br" className="text-indigo-400 hover:underline">contato@blacklinepro.com.br</a></p>
            <p className="mt-2"><strong className="text-white">Assunto:</strong> "Solicitação de Reembolso" ou "Cancelamento"</p>
            <p className="mt-4 text-sm text-zinc-500">Tempo de resposta: até 48 horas úteis</p>
          </div>
        </section>
      </div>
    </div>
  );
}
