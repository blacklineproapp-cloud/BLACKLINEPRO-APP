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

interface RemarketingInitialProps {
  userName?: string;
  userEmail: string;
  appUrl?: string;
}

export const RemarketingInitial = ({
  userName = 'Tatuador',
  userEmail,
  appUrl = 'https://Black Line Pro.com.br',
}: RemarketingInitialProps) => {
  return (
    <Html>
      <Head />
      <Preview>Desbloqueie todo o potencial do Black Line Pro - Editor profissional de stencils</Preview>
      <Body style={styles.body}>
        <div style={styles.wrapper}>
          <Container style={styles.container}>
            <EmailHeader title="Pronto para criar stencils profissionais?" />

            <Section style={styles.content}>
              <Text style={styles.paragraph}>Olá, <strong>{userName}</strong>!</Text>

              <Text style={styles.paragraph}>
                Vimos que você criou sua conta no <strong>Black Line Pro</strong>, a plataforma que
                está transformando o trabalho de mais de <strong>2.500 tatuadores</strong> no Brasil.
              </Text>

              <HighlightBox title="🎨 Com a Tecnologia Black Line Pro você tem:">
                <ul style={styles.list}>
                  <li style={styles.listItem}>
                    <strong>Modo Topográfico</strong> - Sombreamentos 3D com curvas de nível perfeitas
                  </li>
                  <li style={styles.listItem}>
                    <strong>Modo Linhas Perfeitas</strong> - Vetorização limpa para fine line
                  </li>
                  <li style={styles.listItem}>
                    <strong>Geração IA</strong> - Crie designs do zero (Blackwork, Neo Traditional, Realismo...)
                  </li>
                  <li style={styles.listItem}>
                    <strong>Color Match IA</strong> - Identifica cores e sugere tintas por marca
                  </li>
                  <li style={styles.listItem}>
                    <strong>Dividir em A4</strong> - Tattoos grandes divididas com overlap configurável
                  </li>
                  <li style={styles.listItem}>
                    <strong>Aprimorar 4K</strong> - Upscale inteligente para máxima qualidade
                  </li>
                </ul>
              </HighlightBox>

              <Text style={{ ...styles.paragraph, fontSize: '16px', fontWeight: 600 }}>
                <strong>De traços finos a sombreamentos complexos</strong> - nossa IA captura 100%
                dos detalhes, pronto para impressão A4.
              </Text>

              <Section style={styles.priceBox}>
                <Text style={styles.priceLabel}>Plano Starter</Text>
                <Text style={styles.priceValue}>
                  R$ 50<span style={{ fontSize: '16px', fontWeight: 'normal' }}>/mês</span>
                </Text>
                <Text style={styles.priceFeatures}>
                  95 gerações/mês • Editor Completo • Salvar Projetos Ilimitados
                </Text>
                <Text style={styles.priceSavings}>
                  💰 Economize 40% no plano anual (R$ 30/mês)
                </Text>
              </Section>

              <div style={{ textAlign: 'center', margin: '40px 0' }}>
                <EmailButton
                  href={`${appUrl}/pricing?utm_source=email&utm_medium=remarketing&utm_campaign=initial`}
                >
                  Ver Todos os Planos e Preços
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

export default RemarketingInitial;

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
  list: {
    margin: '0',
    paddingLeft: '20px',
    color: '#3f3f46',
  },
  listItem: {
    margin: '10px 0',
    lineHeight: 1.6,
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
    fontSize: '14px',
    color: '#64748b',
  },
  priceValue: {
    margin: '10px 0',
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  priceFeatures: {
    margin: '0',
    fontSize: '14px',
    color: '#64748b',
  },
  priceSavings: {
    margin: '10px 0 0 0',
    fontSize: '12px',
    color: '#6366F1',
  },
  disclaimer: {
    textAlign: 'center' as const,
    marginTop: '30px',
    color: '#a1a1aa',
    fontSize: '14px',
  },
};
