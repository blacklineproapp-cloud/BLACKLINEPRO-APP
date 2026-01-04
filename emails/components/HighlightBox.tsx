import * as React from 'react';
import { Section, Row, Column, Heading } from '@react-email/components';

interface HighlightBoxProps {
  title: string;
  children: React.ReactNode;
}

export const HighlightBox = ({ title, children }: HighlightBoxProps) => {
  return (
    <Section
      style={{
        background: 'linear-gradient(135deg, #ecfdf5 0%, #f5f3ff 100%)',
        padding: '25px',
        borderRadius: '12px',
        margin: '25px 0',
        borderLeft: '4px solid #10b981',
      }}
    >
      <Row>
        <Column>
          <Heading
            style={{
              margin: '0 0 15px 0',
              color: '#10b981',
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            {title}
          </Heading>
          {children}
        </Column>
      </Row>
    </Section>
  );
};
