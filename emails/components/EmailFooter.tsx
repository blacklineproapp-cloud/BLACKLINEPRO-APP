import * as React from 'react';
import { Section, Row, Column, Text, Link, Hr } from '@react-email/components';

interface EmailFooterProps {
  unsubscribeEmail: string;
  appUrl: string;
}

export const EmailFooter = ({ unsubscribeEmail, appUrl }: EmailFooterProps) => {
  return (
    <Section
      style={{
        background: '#fafafa',
        textAlign: 'center',
        color: '#71717a',
        fontSize: '13px',
        padding: '30px',
        borderTop: '1px solid #e4e4e7',
      }}
    >
      <Row>
        <Column>
          <Text
            style={{
              margin: '0 0 10px 0',
              fontSize: '13px',
              color: '#71717a',
            }}
          >
            <strong style={{ color: '#18181b' }}>Black Line Pro</strong> - A Arte do Estêncil
          </Text>

          <Text style={{ margin: '15px 0', fontSize: '13px' }}>
            <Link
              href={appUrl}
              style={{
                color: '#6366F1',
                textDecoration: 'none',
                fontWeight: 600,
                margin: '0 8px',
              }}
            >
              Site
            </Link>
            <span style={{ color: '#71717a' }}>&nbsp;•&nbsp;</span>
            <Link
              href={`${appUrl}/pricing`}
              style={{
                color: '#6366F1',
                textDecoration: 'none',
                fontWeight: 600,
                margin: '0 8px',
              }}
            >
              Ver Planos
            </Link>
            <span style={{ color: '#71717a' }}>&nbsp;•&nbsp;</span>
            <Link
              href={`${appUrl}/dashboard`}
              style={{
                color: '#6366F1',
                textDecoration: 'none',
                fontWeight: 600,
                margin: '0 8px',
              }}
            >
              Acessar App
            </Link>
          </Text>

          <Hr style={{ borderColor: '#e4e4e7', margin: '20px 0' }} />

          <Text
            style={{
              fontSize: '12px',
              margin: '20px 0 0 0',
              color: '#a1a1aa',
              lineHeight: '1.6',
            }}
          >
            Você está recebendo este email porque se cadastrou no Black Line Pro.
            <br />
            <Link
              href={`${appUrl}/unsubscribe?email=${encodeURIComponent(unsubscribeEmail)}`}
              style={{
                color: '#6366F1',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Cancelar emails de marketing
            </Link>
          </Text>
        </Column>
      </Row>
    </Section>
  );
};
