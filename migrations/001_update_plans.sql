-- =============================================================================
-- MIGRATION: Atualizar Sistema de Planos
-- Data: 2025-01-XX
-- Descrição: Adiciona novos planos (editor_only e full_access) e campos para admin
-- =============================================================================

-- 1. Atualizar constraint do campo plan na tabela users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check CHECK (
  plan IN ('free', 'editor_only', 'full_access')
);

-- 2. Adicionar novos campos para controle admin
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS blocked_by UUID,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_ai_requests INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at);

-- 4. Criar índices para ai_usage (analytics)
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id_created_at ON ai_usage(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation_type ON ai_usage(operation_type);

-- 5. Criar índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id_created_at ON payments(user_id, created_at);

-- 6. Adicionar campo para rastrear origem do pagamento
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50);

-- 7. Criar tabela de sessões ativas (para "usuários online")
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity ON active_sessions(last_activity);

-- 8. Criar tabela de logs admin
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_user_id ON admin_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);

-- 9. Criar view para métricas agregadas (performance)
CREATE OR REPLACE VIEW v_daily_metrics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(tokens_used) as total_tokens,
  SUM(cost) as total_cost,
  operation_type
FROM ai_usage
GROUP BY DATE(created_at), operation_type
ORDER BY date DESC;

-- 10. Criar view para usuários ativos por hora (horário de pico)
CREATE OR REPLACE VIEW v_hourly_activity AS
SELECT
  DATE(created_at) as date,
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as requests,
  COUNT(DISTINCT user_id) as unique_users
FROM ai_usage
GROUP BY DATE(created_at), EXTRACT(HOUR FROM created_at)
ORDER BY date DESC, hour DESC;

-- 11. Migrar usuários existentes para novos planos
-- Usuários com tools_unlocked = true vão para full_access
-- Usuários com is_paid = true mas tools_unlocked = false vão para editor_only
UPDATE users
SET plan = 'full_access'
WHERE tools_unlocked = true AND is_paid = true;

UPDATE users
SET plan = 'editor_only'
WHERE is_paid = true AND tools_unlocked = false;

-- 12. Criar função para atualizar last_active_at automaticamente
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET last_active_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Criar trigger para atualizar last_active_at quando houver uso de IA
DROP TRIGGER IF EXISTS trigger_update_last_active ON ai_usage;
CREATE TRIGGER trigger_update_last_active
  AFTER INSERT ON ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();

-- 14. Comentários nas tabelas
COMMENT ON TABLE active_sessions IS 'Rastreia sessões ativas de usuários para dashboard admin';
COMMENT ON TABLE admin_logs IS 'Log de ações administrativas para auditoria';
COMMENT ON VIEW v_daily_metrics IS 'Métricas diárias agregadas de uso de IA';
COMMENT ON VIEW v_hourly_activity IS 'Atividade por hora para identificar horários de pico';

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
