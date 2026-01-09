-- =============================================================================
-- MIGRATION: Sistema de Cortesia Temporária (30 dias)
-- Data: 2026-01-09
-- Descrição: Adiciona campo de expiração para cortesia admin
-- =============================================================================

-- 1. Adicionar coluna de expiração da cortesia
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS admin_courtesy_expires_at TIMESTAMPTZ;

-- 2. Criar índice para performance (buscar cortesias expiradas)
CREATE INDEX IF NOT EXISTS idx_users_courtesy_expires 
  ON users(admin_courtesy_expires_at) 
  WHERE admin_courtesy = true AND admin_courtesy_expires_at IS NOT NULL;

-- 3. Comentários
COMMENT ON COLUMN users.admin_courtesy_expires_at IS 'Data de expiração da cortesia admin (30 dias após concessão)';

-- 4. Atualizar cortesias existentes para ter prazo de 30 dias a partir de agora
UPDATE users 
SET admin_courtesy_expires_at = NOW() + INTERVAL '30 days'
WHERE admin_courtesy = true 
  AND admin_courtesy_expires_at IS NULL
  AND admin_courtesy_granted_at IS NOT NULL;

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
