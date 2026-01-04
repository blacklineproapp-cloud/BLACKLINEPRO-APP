import * as React from 'react';
import { Section, Row, Column, Heading, Text } from '@react-email/components';

interface EmailHeaderProps {
  title: string;
}

export const EmailHeader = ({ title }: EmailHeaderProps) => {
  return (
    <Section
      style={{
        background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #a855f7 100%)',
        padding: '50px 30px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Logo & Tagline */}
      <Row>
        <Column>
          <Heading
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 12px 0',
              letterSpacing: '-0.5px',
              lineHeight: '1.2',
            }}
          >
            StencilFlow
          </Heading>
          <Text
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.9)',
              margin: '0 0 20px 0',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            A Arte do Estêncil
          </Text>
          <Heading
            style={{
              fontSize: '28px',
              color: '#ffffff',
              fontWeight: 700,
              margin: '20px 0 0 0',
              lineHeight: '1.3',
            }}
          >
            {title}
          </Heading>
        </Column>
      </Row>
    </Section>
  );
};
