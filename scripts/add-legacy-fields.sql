-- Migration: Adicionar campos para usuários legacy/cortesia
-- Data: 2026-01-06

-- Adicionar campos na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS courtesy_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_plan VARCHAR(20);

-- Comentários
COMMENT ON COLUMN users.courtesy_deadline IS 'Prazo final para cortesia permanente (ex: 2026-01-10)';
COMMENT ON COLUMN users.assigned_plan IS 'Plano atribuído pelo admin para usuários legacy (legacy, starter, pro, studio)';

-- Índice para buscar usuários com cortesia ativa
CREATE INDEX IF NOT EXISTS idx_users_courtesy_deadline ON users(courtesy_deadline) 
WHERE courtesy_deadline IS NOT NULL;
