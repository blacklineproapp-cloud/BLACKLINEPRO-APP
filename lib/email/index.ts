/**
 * Email Service with Resend
 * Envio de emails transacionais
 */

import { Resend } from 'resend';
import { render } from '@react-email/components';
import RemarketingInitial from '@/emails/templates/RemarketingInitial';
import RemarketingReminder from '@/emails/templates/RemarketingReminder';
import RemarketingFinal from '@/emails/templates/RemarketingFinal';
import CourtesyPaymentLink from '@/emails/templates/CourtesyPaymentLink';

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email remetente (configurar domínio verificado no Resend)
const FROM_EMAIL = process.env.FROM_EMAIL || 'StencilFlow <noreply@stencilflow.com.br>';

// ============================================================================
// TEMPLATES DE EMAIL
// ============================================================================

/**
 * Email de Boas-Vindas
 * Enviado após primeira assinatura
 */
export async function sendWelcomeEmail(email: string, nome: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Resend não configurado, pulando envio');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Bem-vindo ao StencilFlow! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; line-height: 1.6; color: #1e293b; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
              .content { background: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-top: none; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
              .features { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Bem-vindo ao StencilFlow!</h1>
                <p>Sua assinatura está ativa</p>
              </div>
              <div class="content">
                <p>Olá, <strong>${nome}</strong>!</p>

                <p>Obrigado por assinar o StencilFlow. Agora você tem acesso completo ao editor profissional de stencils.</p>

                <div class="features">
                  <h3>🚀 Você já pode usar:</h3>
                  <ul>
                    <li>Editor completo de stencils</li>
                    <li>Modo topográfico</li>
                    <li>Linhas perfeitas</li>
                    <li>Exportação em múltiplos formatos</li>
                  </ul>
                </div>

                <p style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
                    Acessar Dashboard
                  </a>
                </p>

                <p>Se tiver alguma dúvida, responda este email. Estamos aqui para ajudar!</p>

                <p>Bons stencils! 🎨</p>
              </div>
              <div class="footer">
                <p>StencilFlow - Editor Profissional de Stencils</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/assinatura">Gerenciar Assinatura</a></p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log(`[Email] Boas-vindas enviado para: ${email}`);
  } catch (error: any) {
    console.error('[Email] Erro ao enviar boas-vindas:', error.message);
  }
}

/**
 * Email de Confirmação de Pagamento
 * Enviado a cada pagamento recorrente bem-sucedido
 */
export async function sendPaymentConfirmationEmail(
  email: string,
  nome: string,
  amount: number,
  receiptUrl?: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Resend não configurado, pulando envio');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Pagamento Confirmado - StencilFlow ✅',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; line-height: 1.6; color: #1e293b; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
              .content { background: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-top: none; }
              .amount { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; margin: 10px 0; }
              .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Pagamento Recebido!</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${nome}</strong>!</p>

                <p>Confirmamos o recebimento do seu pagamento:</p>

                <div class="amount">
                  R$ ${amount.toFixed(2)}
                </div>

                <p style="text-align: center;">
                  Sua assinatura está ativa e você tem acesso completo à plataforma.
                </p>

                ${receiptUrl ? `
                  <p style="text-align: center;">
                    <a href="${receiptUrl}" class="button">
                      📄 Ver Recibo
                    </a>
                  </p>
                ` : ''}

                <p style="text-align: center; margin-top: 30px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
                    Acessar Dashboard
                  </a>
                </p>

                <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
                  Este é um email automático de confirmação. Se você não reconhece este pagamento, entre em contato conosco imediatamente.
                </p>
              </div>
              <div class="footer">
                <p>StencilFlow - Editor Profissional de Stencils</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/assinatura">Gerenciar Assinatura</a></p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log(`[Email] Confirmação de pagamento enviado para: ${email}`);
  } catch (error: any) {
    console.error('[Email] Erro ao enviar confirmação:', error.message);
  }
}

/**
 * Email de Falha no Pagamento
 * Enviado quando pagamento recorrente falha
 */
export async function sendPaymentFailedEmail(
  email: string,
  nome: string,
  reason?: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Resend não configurado, pulando envio');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Problema com seu Pagamento - StencilFlow ⚠️',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; line-height: 1.6; color: #1e293b; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
              .content { background: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-top: none; }
              .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; }
              .button { display: inline-block; background: #ef4444; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; margin: 10px 0; }
              .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Problema com Pagamento</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${nome}</strong>!</p>

                <div class="warning">
                  <p><strong>Não conseguimos processar seu último pagamento.</strong></p>
                  ${reason ? `<p>Motivo: ${reason}</p>` : ''}
                </div>

                <p>Para manter o acesso à sua assinatura StencilFlow, por favor atualize seu método de pagamento.</p>

                <p style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/assinatura" class="button">
                    🔄 Atualizar Pagamento
                  </a>
                </p>

                <p style="margin-top: 30px;">
                  <strong>O que fazer agora:</strong>
                </p>
                <ol>
                  <li>Acesse o portal de gerenciamento</li>
                  <li>Atualize seu cartão de crédito</li>
                  <li>Ou escolha outro método de pagamento</li>
                </ol>

                <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
                  Se você tiver dúvidas ou precisar de ajuda, responda este email. Estamos aqui para ajudar!
                </p>
              </div>
              <div class="footer">
                <p>StencilFlow - Editor Profissional de Stencils</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log(`[Email] Notificação de falha enviado para: ${email}`);
  } catch (error: any) {
    console.error('[Email] Erro ao enviar notificação:', error.message);
  }
}

/**
 * Email de Cancelamento de Assinatura
 * Enviado quando usuário cancela a assinatura
 */
export async function sendSubscriptionCanceledEmail(
  email: string,
  nome: string,
  endDate?: Date
) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Resend não configurado, pulando envio');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Assinatura Cancelada - StencilFlow',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; line-height: 1.6; color: #1e293b; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #64748b; color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
              .content { background: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-top: none; }
              .info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; margin: 10px 0; }
              .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Assinatura Cancelada</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${nome}</strong>!</p>

                <p>Confirmamos o cancelamento da sua assinatura StencilFlow.</p>

                ${endDate ? `
                  <div class="info">
                    <p><strong>Você ainda terá acesso completo até:</strong></p>
                    <p style="font-size: 20px; color: #3b82f6; text-align: center; margin: 10px 0;">
                      ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                ` : ''}

                <p>Lamentamos ver você partir. Se tiver algum feedback sobre como podemos melhorar, adoraríamos ouvir!</p>

                <p style="margin-top: 30px;">
                  <strong>Você pode voltar quando quiser:</strong>
                </p>
                <p>Seus projetos e configurações ficarão salvos. Para reativar sua assinatura, basta acessar a página de planos.</p>

                <p style="text-align: center; margin-top: 30px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" class="button">
                    Ver Planos
                  </a>
                </p>

                <p style="margin-top: 40px; text-align: center; color: #64748b;">
                  Esperamos te ver de volta em breve! 💙
                </p>
              </div>
              <div class="footer">
                <p>StencilFlow - Editor Profissional de Stencils</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log(`[Email] Cancelamento enviado para: ${email}`);
  } catch (error: any) {
    console.error('[Email] Erro ao enviar cancelamento:', error.message);
  }
}

/**
 * Email de Remarketing para Usuários FREE (React Email Version)
 * Enviado para converter usuários gratuitos em pagantes
 */
export async function sendRemarketingEmail(
  email: string,
  nome: string,
  campaignType: 'initial' | 'reminder' | 'final' = 'initial'
) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Resend não configurado, pulando envio');
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stencilflow.com.br';

  // Mapear tipo de campanha para template React e assunto
  const campaignConfig = {
    initial: {
      subject: 'A Arte do Estêncil - Desbloqueie o StencilFlow Completo',
      template: RemarketingInitial,
    },
    reminder: {
      subject: '48% mais barato que Ghostline - StencilFlow',
      template: RemarketingReminder,
    },
    final: {
      subject: 'Upload → IA → Download - Simples assim',
      template: RemarketingFinal,
    },
  };

  const config = campaignConfig[campaignType];
  const Template = config.template;

  try {
    // Renderizar template React para HTML
    const html = await render(
      Template({
        userName: nome,
        userEmail: email,
        appUrl,
      })
    );

    // Enviar email via Resend
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: config.subject,
      html,
    });

    console.log(`[Email] Remarketing (${campaignType}) enviado para: ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Erro ao enviar remarketing:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Email de Link de Pagamento para Usuários de Cortesia
 * Enviado para usuários migrados que precisam configurar assinatura Stripe
 */
export async function sendCourtesyPaymentEmail(
  email: string,
  nome: string,
  plan: string,
  paymentLink: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Resend não configurado, pulando envio');
    return { success: false, error: 'Resend não configurado' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stencilflow.com.br';

  try {
    // Renderizar template React para HTML
    const html = await render(
      CourtesyPaymentLink({
        userName: nome,
        userEmail: email,
        userPlan: plan,
        paymentLink,
        appUrl,
      })
    );

    // Enviar email via Resend
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Migração StencilFlow - Configure sua assinatura recorrente',
      html,
    });

    console.log(`[Email] Link de pagamento (cortesia) enviado para: ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Erro ao enviar link de cortesia:', error.message);
    return { success: false, error: error.message };
  }
}
