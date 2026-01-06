-- Migration: Atualizar TODAS as constraints de plano para incluir 'legacy'
-- Data: 2026-01-06

-- Remover todas as possíveis constraints de validação de plano
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_plan_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS plan_check;

-- Adicionar nova constraint única incluindo 'legacy'
ALTER TABLE users ADD CONSTRAINT users_plan_check 
  CHECK (plan IN ('free', 'starter', 'pro', 'studio', 'enterprise', 'legacy'));

-- Comentário
COMMENT ON CONSTRAINT users_plan_check ON users IS 'Valida planos permitidos: free, starter, pro, studio, enterprise, legacy';
