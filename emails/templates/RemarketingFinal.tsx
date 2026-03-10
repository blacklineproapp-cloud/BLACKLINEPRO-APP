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
import { Stats } from '../components/Stats';

interface RemarketingFinalProps {
  userName?: string;
  userEmail: string;
  appUrl?: string;
}

export const RemarketingFinal = ({
  userName = 'Tatuador',
  userEmail,
  appUrl = 'https://Black Line Pro.com.br',
}: RemarketingFinalProps) => {
  return (
    <Html>
      <Head />
      <Preview>Upload → IA → Download - Crie stencils profissionais em 3 passos</Preview>
      <Body style={styles.body}>
        <div style={styles.wrapper}>
          <Container style={styles.container}>
            <EmailHeader title="Stencils profissionais em 3 passos" />

            <Section style={styles.content}>
              <Text style={styles.paragraph}>Olá, <strong>{userName}</strong>!</Text>

              <Text style={styles.paragraph}>
                Este é nosso último lembrete sobre como o <strong>Black Line Pro</strong> pode
                simplificar seu trabalho.
              </Text>

              <Section style={styles.processBox}>
                <Text style={styles.processTitle}>O Processo:</Text>
                <div style={styles.processSteps}>
                  <div style={styles.step}>
                    <div style={styles.stepIcon}>📤</div>
                    <Text style={styles.stepNumber}>1. Upload</Text>
                    <Text style={styles.stepLabel}>Carregue a imagem</Text>
                  </div>
                  <div style={styles.stepArrow}>→</div>
                  <div style={styles.step}>
                    <div style={styles.stepIcon}>🤖</div>
                    <Text style={styles.stepNumber}>2. IA Processa</Text>
                    <Text style={styles.stepLabel}>10-20 segundos</Text>
                  </div>
                  <div style={styles.stepArrow}>→</div>
                  <div style={styles.step}>
                    <div style={styles.stepIcon}>⬇️</div>
                    <Text style={styles.stepNumber}>3. Download</Text>
                    <Text style={styles.stepLabel}>PNG 300 DPI</Text>
                  </div>
                </div>
              </Section>

              <Stats
                stats={[
                  { number: '2.500+', label: 'Tatuadores Ativos' },
                  { number: '300 DPI', label: 'Qualidade Profissional' },
                  { number: '10-20s', label: 'Tempo de Processo' },
                ]}
              />

              <Text style={{ ...styles.paragraph, textAlign: 'center', fontSize: '18px' }}>
                <strong>Dê vida às suas ideias com a tecnologia mais avançada do mercado.</strong>
              </Text>

              <Section style={styles.priceBox}>
                <Text style={styles.priceLabel}>Planos a partir de</Text>
                <Text style={styles.priceValue}>R$ 50/mês</Text>
                <Text style={styles.priceFeatures}>
                  Cancele quando quiser • Sem burocracias
                </Text>
              </Section>

              <div style={{ textAlign: 'center', margin: '40px 0' }}>
                <EmailButton
                  href={`${appUrl}/pricing?utm_source=email&utm_medium=remarketing&utm_campaign=final`}
                >
                  Criar Meu Primeiro Stencil Profissional
                </EmailButton>
              </div>

              <Text style={styles.disclaimer}>
                ✓ Acesso imediato após pagamento &nbsp;•&nbsp; ✓ Cancele quando quiser
              </Text>
            </Section>

            <EmailFooter unsubscribeEmail={userEmail} appUrl={appUrl} />
          </Container>
        </div>
      </Body>
    </Html>
  );
};

export default RemarketingFinal;

const styles = {
  body: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    lineHeight: 1.6,
    color: '#18181b',
    margin: 0,
    padding: 0,
    backgroundColor: '#09090b',
  },
  wrapper: {
    backgroundColor: '#09090b',
    padding: '40px 20px',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  content: {
    backgroundColor: '#ffffff',
    padding: '40px 30px',
  },
  paragraph: {
    color: '#3f3f46',
    lineHeight: 1.7,
    margin: '0 0 16px 0',
    fontSize: '15px',
  },
  processBox: {
    background: 'linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%)',
    padding: '30px',
    borderRadius: '12px',
    margin: '25px 0',
  },
  processTitle: {
    margin: '0 0 20px 0',
    textAlign: 'center' as const,
    color: '#3b82f6',
    fontSize: '18px',
    fontWeight: 700,
  },
  processSteps: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  step: {
    flex: 1,
  },
  stepIcon: {
    fontSize: '36px',
  },
  stepNumber: {
    margin: '10px 0 0 0',
    fontWeight: 'bold',
  },
  stepLabel: {
    margin: '5px 0 0 0',
    fontSize: '14px',
    color: '#64748b',
  },
  stepArrow: {
    fontSize: '24px',
    color: '#3b82f6',
    margin: '0 10px',
  },
  priceBox: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '8px',
    margin: '25px 0',
    textAlign: 'center' as const,
  },
  priceLabel: {
    margin: '0',
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#64748b',
  },
  priceValue: {
    margin: '10px 0',
    textAlign: 'center' as const,
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  priceFeatures: {
    margin: '0',
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#64748b',
  },
  disclaimer: {
    textAlign: 'center' as const,
    marginTop: '30px',
    color: '#a1a1aa',
    fontSize: '14px',
  },
};
