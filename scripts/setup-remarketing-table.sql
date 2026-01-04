-- Tabela para rastrear emails de remarketing enviados
CREATE TABLE IF NOT EXISTS remarketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_type VARCHAR(20) NOT NULL CHECK (campaign_type IN ('initial', 'reminder', 'final')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_status VARCHAR(20) DEFAULT 'sent' CHECK (email_status IN ('sent', 'failed', 'bounced', 'opened', 'clicked')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Evitar envio duplicado do mesmo tipo de campanha
  UNIQUE(user_id, campaign_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_remarketing_user_id ON remarketing_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_remarketing_campaign_type ON remarketing_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_remarketing_sent_at ON remarketing_campaigns(sent_at);
CREATE INDEX IF NOT EXISTS idx_remarketing_status ON remarketing_campaigns(email_status);

-- Comentários
COMMENT ON TABLE remarketing_campaigns IS 'Rastreamento de campanhas de remarketing enviadas para usuários FREE';
COMMENT ON COLUMN remarketing_campaigns.campaign_type IS 'Tipo de campanha: initial (Dia 1), reminder (Dia 7), final (Dia 14)';
COMMENT ON COLUMN remarketing_campaigns.email_status IS 'Status do email: sent, failed, bounced, opened, clicked';
