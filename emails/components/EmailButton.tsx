import * as React from 'react';
import { Button } from '@react-email/components';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export const EmailButton = ({ href, children }: EmailButtonProps) => {
  return (
    <Button
      href={href}
      style={{
        display: 'inline-block',
        background: 'linear-gradient(135deg, #10b981 0%, #a855f7 100%)',
        color: '#ffffff',
        padding: '18px 48px',
        textDecoration: 'none',
        borderRadius: '12px',
        margin: '30px 0',
        fontWeight: 700,
        fontSize: '16px',
        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </Button>
  );
};
