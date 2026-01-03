-- ============================================================================
-- Migration: IP Abuse Tracking System
-- Descrição: Rastreia signups por IP para prevenir abuso de contas gratuitas
-- Data: 2026-01-03
-- ============================================================================

-- Tabela para rastrear signups por IP
CREATE TABLE IF NOT EXISTS ip_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address TEXT NOT NULL,
  email TEXT NOT NULL,
  clerk_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ip_signups_ip_address ON ip_signups(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_signups_created_at ON ip_signups(created_at);
CREATE INDEX IF NOT EXISTS idx_ip_signups_ip_date ON ip_signups(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_ip_signups_clerk_id ON ip_signups(clerk_id);
CREATE INDEX IF NOT EXISTS idx_ip_signups_blocked ON ip_signups(is_blocked) WHERE is_blocked = TRUE;

-- Tabela para rastrear uso de trials por IP
CREATE TABLE IF NOT EXISTS ip_trial_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_id TEXT,
  action_type TEXT NOT NULL, -- 'editor_generation' | 'ai_request' | 'tool_usage'
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para rastreamento de trials
CREATE INDEX IF NOT EXISTS idx_ip_trial_ip_address ON ip_trial_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_trial_created_at ON ip_trial_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ip_trial_ip_date ON ip_trial_usage(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_ip_trial_action ON ip_trial_usage(action_type);

-- Comentários para documentação
COMMENT ON TABLE ip_signups IS 'Rastreia todos os signups por endereço IP para detecção de abuso';
COMMENT ON TABLE ip_trial_usage IS 'Rastreia uso de recursos gratuitos por IP para prevenir abuso';

COMMENT ON COLUMN ip_signups.ip_address IS 'Endereço IP do usuário no momento do signup';
COMMENT ON COLUMN ip_signups.is_blocked IS 'TRUE se este IP foi bloqueado por abuso';
COMMENT ON COLUMN ip_signups.metadata IS 'Dados adicionais (user agent, país, etc)';

COMMENT ON COLUMN ip_trial_usage.action_type IS 'Tipo de ação trial realizada';
COMMENT ON COLUMN ip_trial_usage.metadata IS 'Detalhes da ação (ex: modo do stencil, ferramenta usada)';
