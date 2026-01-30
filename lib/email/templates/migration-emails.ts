/**
 * Templates de Email para Migração Stripe → Asaas
 *
 * Estes templates são usados durante o processo de migração
 * e para notificações de pagamento recorrente
 */

export interface EmailTemplateParams {
  userName: string;
  userEmail: string;
  planName: string;
  planValue: number;
  nextDueDate: string;
  paymentUrl?: string;
  boletoUrl?: string;
  pixPayload?: string;
}

/**
 * Email 1: Aviso de Migração (7-10 dias antes)
 * Envia quando vamos migrar o usuário do Stripe para Asaas
 */
export function getMigrationNoticeEmail(params: EmailTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, planName, planValue, nextDueDate } = params;
  const formattedValue = `R$ ${planValue.toFixed(2).replace('.', ',')}`;
  const formattedDate = formatDate(nextDueDate);

  return {
    subject: `Mudança importante no pagamento do StencilFlow`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .highlight { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
    .emoji { font-size: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>StencilFlow</h1>
      <p>Novidades no seu pagamento</p>
    </div>
    <div class="content">
      <p>Olá, <strong>${userName}</strong>!</p>

      <p>Estamos migrando nosso sistema de pagamentos para oferecer mais opções para você:</p>

      <div class="highlight">
        <p><span class="emoji">✅</span> <strong>PIX</strong> - Aprovação instantânea</p>
        <p><span class="emoji">✅</span> <strong>Boleto bancário</strong> - Pague em qualquer banco</p>
        <p><span class="emoji">✅</span> <strong>Cartão de crédito</strong> - Continua disponível</p>
      </div>

      <h3>O que muda?</h3>
      <ul>
        <li>Sua próxima cobrança será no dia <strong>${formattedDate}</strong></li>
        <li>Você receberá um link para escolher como pagar</li>
        <li>Valor continua o mesmo: <strong>${formattedValue}/mês</strong></li>
      </ul>

      <h3>O que NÃO muda?</h3>
      <ul>
        <li>Seu acesso continua normal</li>
        <li>Suas criações estão seguras</li>
        <li>Mesmo plano (${planName}), mesmos benefícios</li>
      </ul>

      <p>Qualquer dúvida, responda este email ou acesse <strong>/suporte</strong> no app.</p>

      <p>Abraço,<br><strong>Equipe StencilFlow</strong></p>
    </div>
    <div class="footer">
      <p>StencilFlow - Transforme suas ideias em stencils profissionais</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `
Olá, ${userName}!

Estamos migrando nosso sistema de pagamentos para oferecer mais opções para você:

✅ PIX - Aprovação instantânea
✅ Boleto bancário - Pague em qualquer banco
✅ Cartão de crédito - Continua disponível

O QUE MUDA?
- Sua próxima cobrança será no dia ${formattedDate}
- Você receberá um link para escolher como pagar
- Valor continua o mesmo: ${formattedValue}/mês

O QUE NÃO MUDA?
- Seu acesso continua normal
- Suas criações estão seguras
- Mesmo plano (${planName}), mesmos benefícios

Qualquer dúvida, responda este email ou acesse /suporte no app.

Abraço,
Equipe StencilFlow
    `.trim(),
  };
}

/**
 * Email 2: Link de Pagamento (dia da cobrança)
 */
export function getPaymentDueEmail(params: EmailTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, planName, planValue, nextDueDate, paymentUrl, boletoUrl } = params;
  const formattedValue = `R$ ${planValue.toFixed(2).replace('.', ',')}`;
  const formattedDate = formatDate(nextDueDate);

  return {
    subject: `Sua fatura StencilFlow - ${getMonthName(nextDueDate)}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .invoice-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .amount { font-size: 32px; font-weight: bold; color: #10b981; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px 5px; }
    .btn-secondary { background: #6b7280; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>StencilFlow</h1>
      <p>Sua fatura está disponível</p>
    </div>
    <div class="content">
      <p>Olá, <strong>${userName}</strong>!</p>

      <p>Sua fatura do plano <strong>${planName}</strong> está disponível:</p>

      <div class="invoice-box">
        <p style="color: #6b7280; margin-bottom: 5px;">Valor</p>
        <p class="amount">${formattedValue}</p>
        <p style="color: #6b7280;">Vencimento: ${formattedDate}</p>
      </div>

      <div style="text-align: center;">
        ${paymentUrl ? `<a href="${paymentUrl}" class="btn">PAGAR AGORA</a>` : ''}
        ${boletoUrl ? `<a href="${boletoUrl}" class="btn btn-secondary">VER BOLETO</a>` : ''}
      </div>

      <p style="margin-top: 30px;"><strong>Escolha como pagar:</strong></p>
      <ul>
        <li><strong>PIX</strong> - Aprovação em segundos</li>
        <li><strong>Boleto</strong> - Vence em 3 dias úteis</li>
        <li><strong>Cartão</strong> - Parcele se preferir</li>
      </ul>

      <p>Seu acesso continua ativo. Após o pagamento, você recebe a confirmação por email.</p>

      <p>Abraço,<br><strong>Equipe StencilFlow</strong></p>
    </div>
    <div class="footer">
      <p>StencilFlow - Transforme suas ideias em stencils profissionais</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `
Olá, ${userName}!

Sua fatura do plano ${planName} está disponível:

💰 Valor: ${formattedValue}
📅 Vencimento: ${formattedDate}

${paymentUrl ? `PAGAR AGORA: ${paymentUrl}` : ''}
${boletoUrl ? `VER BOLETO: ${boletoUrl}` : ''}

Escolha como pagar:
• PIX - Aprovação em segundos
• Boleto - Vence em 3 dias úteis
• Cartão - Parcele se preferir

Seu acesso continua ativo. Após o pagamento, você recebe a confirmação por email.

Abraço,
Equipe StencilFlow
    `.trim(),
  };
}

/**
 * Email 3: Lembrete de Pagamento (D+1 ou D+2)
 */
export function getPaymentReminderEmail(params: EmailTemplateParams & { daysOverdue: number }): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, planValue, paymentUrl, daysOverdue } = params;
  const formattedValue = `R$ ${planValue.toFixed(2).replace('.', ',')}`;
  const daysLeft = 3 - daysOverdue;

  return {
    subject: daysOverdue === 1
      ? `Lembrete: Pagamento pendente - StencilFlow`
      : `URGENTE: Último dia para regularizar - StencilFlow`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${daysLeft <= 1 ? '#dc2626' : '#f59e0b'}; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .warning-box { background: ${daysLeft <= 1 ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${daysLeft <= 1 ? '#fecaca' : '#fde68a'}; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${daysLeft <= 1 ? '⚠️ URGENTE' : '⏰ Lembrete'}</h1>
      <p>Pagamento pendente</p>
    </div>
    <div class="content">
      <p>Olá, <strong>${userName}</strong>!</p>

      <div class="warning-box">
        <p><strong>${daysLeft <= 1 ? 'ÚLTIMO DIA!' : `Restam ${daysLeft} dias`}</strong> para regularizar seu pagamento.</p>
        <p>Valor: <strong>${formattedValue}</strong></p>
      </div>

      ${daysLeft <= 1 ? `
      <p><strong>⚠️ Atenção:</strong> Após hoje, a geração de stencils e uso da IA serão bloqueados até a regularização.</p>
      ` : `
      <p>Evite a interrupção do seu acesso. Regularize agora!</p>
      `}

      <div style="text-align: center; margin: 30px 0;">
        ${paymentUrl ? `<a href="${paymentUrl}" class="btn">PAGAR AGORA</a>` : ''}
      </div>

      <p>Se já pagou, desconsidere este email - a confirmação pode levar alguns minutos.</p>

      <p>Abraço,<br><strong>Equipe StencilFlow</strong></p>
    </div>
    <div class="footer">
      <p>StencilFlow - Transforme suas ideias em stencils profissionais</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `
Olá, ${userName}!

${daysLeft <= 1 ? 'ÚLTIMO DIA' : `Restam ${daysLeft} dias`} para regularizar seu pagamento.
Valor: ${formattedValue}

${daysLeft <= 1 ? 'Após hoje, a geração de stencils e uso da IA serão bloqueados.' : 'Evite a interrupção do seu acesso.'}

${paymentUrl ? `PAGAR AGORA: ${paymentUrl}` : ''}

Se já pagou, desconsidere este email.

Abraço,
Equipe StencilFlow
    `.trim(),
  };
}

/**
 * Email 4: Conta Bloqueada (após 3 dias)
 */
export function getAccountBlockedEmail(params: EmailTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, planValue, paymentUrl } = params;
  const formattedValue = `R$ ${planValue.toFixed(2).replace('.', ',')}`;

  return {
    subject: `Sua conta StencilFlow foi limitada`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .blocked-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚫 Acesso Limitado</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${userName}</strong>!</p>

      <div class="blocked-box">
        <p><strong>Seu pagamento não foi identificado</strong> e algumas funcionalidades foram limitadas:</p>
        <ul>
          <li>❌ Geração de stencils bloqueada</li>
          <li>❌ Uso da IA bloqueado</li>
          <li>✅ Acesso à galeria e histórico mantido</li>
        </ul>
      </div>

      <p><strong>Regularize agora</strong> e recupere seu acesso imediatamente:</p>

      <div style="text-align: center; margin: 30px 0;">
        ${paymentUrl ? `<a href="${paymentUrl}" class="btn">REGULARIZAR AGORA - ${formattedValue}</a>` : ''}
      </div>

      <p>Após o pagamento, seu acesso é liberado automaticamente em poucos minutos.</p>

      <p>Dúvidas? Responda este email ou acesse /suporte no app.</p>

      <p>Abraço,<br><strong>Equipe StencilFlow</strong></p>
    </div>
    <div class="footer">
      <p>StencilFlow - Transforme suas ideias em stencils profissionais</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `
Olá, ${userName}!

Seu pagamento não foi identificado e algumas funcionalidades foram limitadas:

❌ Geração de stencils bloqueada
❌ Uso da IA bloqueado
✅ Acesso à galeria e histórico mantido

Regularize agora e recupere seu acesso:
${paymentUrl || 'Acesse o app para pagar'}

Valor: ${formattedValue}

Após o pagamento, seu acesso é liberado automaticamente.

Dúvidas? Responda este email ou acesse /suporte no app.

Abraço,
Equipe StencilFlow
    `.trim(),
  };
}

/**
 * Email 5: Confirmação de Pagamento
 */
export function getPaymentConfirmedEmail(params: EmailTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, planName, planValue, nextDueDate } = params;
  const formattedValue = `R$ ${planValue.toFixed(2).replace('.', ',')}`;
  const formattedDate = formatDate(nextDueDate);

  return {
    subject: `Pagamento confirmado - StencilFlow`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .success-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .checkmark { font-size: 48px; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    h1 { margin: 0; font-size: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Pagamento Confirmado!</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${userName}</strong>!</p>

      <div class="success-box">
        <p class="checkmark">✅</p>
        <p style="font-size: 18px; font-weight: bold; color: #059669;">Seu pagamento foi confirmado!</p>
        <p>Plano: <strong>${planName}</strong></p>
        <p>Valor: <strong>${formattedValue}</strong></p>
      </div>

      <p>Seu acesso está ativo e todas as funcionalidades estão liberadas.</p>

      <p><strong>Próxima cobrança:</strong> ${formattedDate}</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://stencilflow.com.br/dashboard" class="btn">ACESSAR STENCILFLOW</a>
      </div>

      <p>Obrigado por usar o StencilFlow!</p>

      <p>Abraço,<br><strong>Equipe StencilFlow</strong></p>
    </div>
    <div class="footer">
      <p>StencilFlow - Transforme suas ideias em stencils profissionais</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `
Olá, ${userName}!

✅ Seu pagamento foi confirmado!

Plano: ${planName}
Valor: ${formattedValue}

Seu acesso está ativo e todas as funcionalidades estão liberadas.

Próxima cobrança: ${formattedDate}

Acesse: https://stencilflow.com.br/dashboard

Obrigado por usar o StencilFlow!

Abraço,
Equipe StencilFlow
    `.trim(),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getMonthName(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
