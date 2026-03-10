import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
} from '@react-email/components';
import { EmailHeader } from '../components/EmailHeader';
import { EmailButton } from '../components/EmailButton';
import { EmailFooter } from '../components/EmailFooter';
import { HighlightBox } from '../components/HighlightBox';

interface CourtesyPaymentLinkProps {
  userName?: string;
  userEmail: string;
  userPlan: string;
  paymentLink: string;
  appUrl?: string;
}

export const CourtesyPaymentLink = ({
  userName = 'Tatuador',
  userEmail,
  userPlan = 'ink',
  paymentLink,
  appUrl = 'https://Black Line Pro.com.br',
}: CourtesyPaymentLinkProps) => {
  const planNames: Record<string, string> = {
    ink: 'Blackline Ink (R$ 50/mês)',
    pro: 'Blackline Pro (R$ 100/mês)',
    studio: 'Blackline Studio (R$ 300/mês)',
  };

  const planFeatures: Record<string, string[]> = {
    ink: [
      '95 gerações de stencil por mês',
      'Editor completo com todas as ferramentas',
      'Salvar projetos ilimitados',
      'Suporte prioritário',
    ],
    pro: [
      '210 gerações de stencil por mês',
      'Editor completo + ferramentas PRO',
      'Geração IA',
      'Color Match IA',
      'Dividir A4',
      'Aprimorar 4K',
    ],
    studio: [
      '680 gerações de stencil por mês',
      'Todas as ferramentas PRO',
      'Multi-usuário (3 contas)',
      'Prioridade máxima no suporte',
      'API de integração',
    ],
  };

  const planName = planNames[userPlan] || planNames.ink;
  const features = planFeatures[userPlan] || planFeatures.ink;

  return (
    <Html>
      <Head />
      <Preview>Migração Black Line Pro - Configure sua assinatura recorrente</Preview>
      <Body style={styles.body}>
        <div style={styles.wrapper}>
          <Container style={styles.container}>
            <EmailHeader title="Continue aproveitando o Black Line Pro!" />

            <Section style={styles.content}>
              <Text style={styles.paragraph}>Olá, <strong>{userName}</strong>!</Text>

              <Text style={styles.paragraph}>
                Você está recebendo este email porque <strong>migrou do nosso app anterior</strong> e
                está aproveitando o <strong>Black Line Pro</strong> com acesso temporário de cortesia.
              </Text>

              <HighlightBox title="🎯 Ação Necessária">
                <Text style={{ ...styles.paragraph, margin: '0 0 12px 0' }}>
                   Para <strong>continuar usando todas as ferramentas</strong> sem interrupções,
                   você precisa configurar sua assinatura recorrente.
                 </Text>
                 <Text style={{ ...styles.paragraph, margin: '0' }}>
                   Clique no botão abaixo para acessar o <strong>checkout seguro</strong> e
                   garantir seu acesso contínuo.
                 </Text>
               </HighlightBox>
 
               <Section style={styles.planBox}>
                 <Text style={styles.planLabel}>Seu Plano Atual</Text>
                 <Text style={styles.planName}>{planName}</Text>
                 <ul style={styles.list}>
                   {features.map((feature, index) => (
                     <li key={index} style={styles.listItem}>
                       <strong>✓</strong> {feature}
                     </li>
                   ))}
                 </ul>
               </Section>
 
               <div style={{ textAlign: 'center', margin: '40px 0' }}>
                 <EmailButton href={paymentLink}>
                   Configurar Assinatura Agora
                 </EmailButton>
               </div>
 
               <Section style={styles.warningBox}>
                 <Text style={styles.warningText}>
                   ⚠️ <strong>Importante:</strong> Sem a configuração da assinatura, seu acesso às
                   ferramentas premium será interrompido em breve.
                 </Text>
               </Section>
 
               <Text style={styles.paragraph}>
                 <strong>Pagamento Seguro e Flexível</strong>
               </Text>
               <Text style={styles.paragraph}>
                 Utilizamos as plataformas de pagamento mais seguras do mercado.
                 Você pode pagar com <strong>cartão de crédito</strong>, <strong>PIX</strong>,
                 ou <strong>boleto bancário</strong>.
               </Text>
 
               <Text style={styles.paragraph}>
                 💳 <strong>Pagamento 100% seguro</strong><br />
                 🔄 <strong>Cobrança automática mensal</strong><br />
                 ❌ <strong>Cancele quando quiser</strong> (sem multas ou taxas)
               </Text>

              <Text style={styles.disclaimer}>
                Qualquer dúvida, responda este email ou entre em contato via suporte no app.
              </Text>
            </Section>

            <EmailFooter unsubscribeEmail={userEmail} appUrl={appUrl} />
          </Container>
        </div>
      </Body>
    </Html>
  );
};

const styles = {
  body: {
    backgroundColor: '#000000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
    padding: 0,
  },
  wrapper: {
    backgroundColor: '#000000',
    padding: '20px 0',
  },
  container: {
    backgroundColor: '#0a0a0a',
    border: '1px solid #27272a',
    borderRadius: '12px',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0',
  },
  content: {
    padding: '32px',
  },
  paragraph: {
    color: '#d4d4d8',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
  },
  planBox: {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '12px',
    padding: '24px',
    margin: '24px 0',
    textAlign: 'center' as const,
  },
  planLabel: {
    color: '#a1a1aa',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 8px 0',
  },
  planName: {
    color: '#8b5cf6',
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 20px 0',
  },
  list: {
    color: '#d4d4d8',
    fontSize: '14px',
    lineHeight: '1.8',
    margin: '0',
    padding: '0 0 0 20px',
    textAlign: 'left' as const,
  },
  listItem: {
    margin: '8px 0',
  },
  warningBox: {
    backgroundColor: '#422006',
    border: '1px solid #78350f',
    borderRadius: '8px',
    padding: '16px',
    margin: '24px 0',
  },
  warningText: {
    color: '#fbbf24',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
  },
  disclaimer: {
    color: '#71717a',
    fontSize: '12px',
    lineHeight: '1.6',
    textAlign: 'center' as const,
    margin: '32px 0 0 0',
    padding: '20px 0 0 0',
    borderTop: '1px solid #27272a',
  },
};

// Export default para preview
export default CourtesyPaymentLink;
