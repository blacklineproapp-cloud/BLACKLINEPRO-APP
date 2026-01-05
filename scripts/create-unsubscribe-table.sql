-- Tabela para armazenar emails que deram unsubscribe de marketing
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida por email
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);

-- Comentários
COMMENT ON TABLE email_unsubscribes IS 'Lista de emails que cancelaram inscrição de emails de marketing';
COMMENT ON COLUMN email_unsubscribes.email IS 'Email do usuário que deu unsubscribe';
COMMENT ON COLUMN email_unsubscribes.unsubscribed_at IS 'Data e hora do unsubscribe';
