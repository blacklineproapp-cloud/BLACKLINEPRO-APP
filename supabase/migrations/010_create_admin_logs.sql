-- =====================================================
-- MIGRATION: Criar tabela admin_logs
-- Descrição: Tabela para auditoria de ações administrativas
-- Data: 2026-01-09
-- =====================================================

-- Criar tabela admin_logs se não existir
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_user ON admin_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user ON admin_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Comentários
COMMENT ON TABLE admin_logs IS 'Registro de auditoria de ações administrativas';
COMMENT ON COLUMN admin_logs.admin_user_id IS 'ID do admin que executou a ação';
COMMENT ON COLUMN admin_logs.action IS 'Tipo de ação executada (block_user, activate_user_atomic, etc)';
COMMENT ON COLUMN admin_logs.target_user_id IS 'ID do usuário afetado pela ação';
COMMENT ON COLUMN admin_logs.details IS 'Detalhes adicionais da ação em formato JSON';
