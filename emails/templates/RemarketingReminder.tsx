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

interface RemarketingReminderProps {
  userName?: string;
  userEmail: string;
  appUrl?: string;
}

export const RemarketingReminder = ({
  userName = 'Tatuador',
  userEmail,
  appUrl = 'https://stencilflow.com.br',
}: RemarketingReminderProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        48% mais barato que Ghostline - StencilFlow com recursos exclusivos
      </Preview>
      <Body style={styles.body}>
        <div style={styles.wrapper}>
          <Container style={styles.container}>
            <EmailHeader title="Por que tatuadores estão migrando para o StencilFlow?" />

            <Section style={styles.content}>
              <Text style={styles.paragraph}>Olá, <strong>{userName}</strong>!</Text>

              <Text style={styles.paragraph}>
                Você sabia que o <strong>StencilFlow é 48% mais barato</strong> que o Ghostline e
                oferece recursos que a concorrência não tem?
              </Text>

              <Section style={styles.comparisonTable}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      <th style={styles.th}>Recurso</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>StencilFlow</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Ghostline</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.td}>Geração IA</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>✅</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>❌</td>
                    </tr>
                    <tr>
                      <td style={styles.td}>Color Match IA</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>✅</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>❌</td>
                    </tr>
                    <tr>
                      <td style={styles.td}>Dividir em A4</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>✅</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>❌</td>
                    </tr>
                    <tr style={{ background: '#f0f9ff' }}>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>Preço</td>
                      <td
                        style={{
                          ...styles.td,
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: '#10b981',
                        }}
                      >
                        R$ 50/mês
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          textAlign: 'center',
                          color: '#64748b',
                        }}
                      >
                        R$ 97+/mês
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>

              <HighlightBox title="💎 O que você ganha migrando agora:">
                <ul style={styles.list}>
                  <li style={styles.listItem}>
                    <strong>Economia imediata</strong> - R$ 47/mês a menos
                  </li>
                  <li style={styles.listItem}>
                    <strong>Ferramentas exclusivas</strong> - Color Match, Dividir A4, Geração IA
                  </li>
                  <li style={styles.listItem}>
                    <strong>Fidelidade total</strong> - Nossa tecnologia Stencil Flow captura 100%
                    dos detalhes
                  </li>
                  <li style={styles.listItem}>
                    <strong>Suporte em português</strong> - Resposta rápida quando precisar
                  </li>
                </ul>
              </HighlightBox>

              <Text style={{ ...styles.paragraph, fontWeight: 600 }}>
                <strong>Junte-se a +2.500 tatuadores</strong> que já escolheram qualidade com o
                melhor custo-benefício.
              </Text>

              <div style={{ textAlign: 'center', margin: '40px 0' }}>
                <EmailButton
                  href={`${appUrl}/pricing?utm_source=email&utm_medium=remarketing&utm_campaign=reminder`}
                >
                  Começar Agora por R$ 50/mês
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

export default RemarketingReminder;

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
  comparisonTable: {
    margin: '25px 0',
  },
  th: {
    padding: '12px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #e4e4e7',
    fontWeight: 700,
    fontSize: '13px',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e4e4e7',
    fontSize: '14px',
  },
  disclaimer: {
    textAlign: 'center' as const,
    marginTop: '30px',
    color: '#a1a1aa',
    fontSize: '14px',
  },
};
