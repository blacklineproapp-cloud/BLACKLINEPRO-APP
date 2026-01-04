import * as React from 'react';
import { Section, Row, Column, Text } from '@react-email/components';

interface Stat {
  number: string;
  label: string;
}

interface StatsProps {
  stats: Stat[];
}

export const Stats = ({ stats }: StatsProps) => {
  return (
    <Section style={{ margin: '30px 0', textAlign: 'center' }}>
      <Row>
        {stats.map((stat, index) => (
          <Column key={index} style={{ padding: '0 10px' }}>
            <Text
              style={{
                fontSize: '36px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #10b981 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: '0',
              }}
            >
              {stat.number}
            </Text>
            <Text
              style={{
                fontSize: '13px',
                color: '#71717a',
                marginTop: '5px',
                fontWeight: 600,
                margin: '5px 0 0 0',
              }}
            >
              {stat.label}
            </Text>
          </Column>
        ))}
      </Row>
    </Section>
  );
};
