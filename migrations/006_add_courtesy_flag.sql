-- ============================================
-- Migration 006: Add Admin Courtesy Flag
-- Adiciona campos para rastrear planos cortesia
-- ============================================

-- Adicionar campos de cortesia
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_courtesy BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_courtesy_granted_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_courtesy_granted_at TIMESTAMP WITH TIME ZONE;

-- Criar índice para queries de cortesia
CREATE INDEX IF NOT EXISTS idx_users_admin_courtesy ON users(admin_courtesy) WHERE admin_courtesy = true;

-- Adicionar comentários
COMMENT ON COLUMN users.admin_courtesy IS 'Indica se o plano foi concedido como cortesia pelo admin (sem cobrança)';
COMMENT ON COLUMN users.admin_courtesy_granted_by IS 'ID do admin que concedeu a cortesia';
COMMENT ON COLUMN users.admin_courtesy_granted_at IS 'Data/hora em que a cortesia foi concedida';

-- Log da migração
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 006 aplicada com sucesso';
  RAISE NOTICE '✅ Campos de cortesia adicionados à tabela users';
END $$;
