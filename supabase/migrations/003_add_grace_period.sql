-- ============================================================================
-- MIGRATION 003: Grace Period Support
-- Adiciona suporte para período de graça (usuários migrados até Jan 10, 2025)
-- ============================================================================

-- Adicionar coluna grace_period_until em users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ DEFAULT NULL;

-- Adicionar coluna auto_bill_after_grace em users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auto_bill_after_grace BOOLEAN DEFAULT false;

-- Adicionar índice para buscar grace periods expirados
CREATE INDEX IF NOT EXISTS idx_users_grace_period
ON users(grace_period_until)
WHERE grace_period_until IS NOT NULL;

-- Comentários
COMMENT ON COLUMN users.grace_period_until IS 'Data até quando o usuário tem acesso gratuito (usuários migrados)';
COMMENT ON COLUMN users.auto_bill_after_grace IS 'Se true, cria subscription automática no Stripe após grace period';

-- ============================================================================
-- FUNCTION: Check Expired Grace Periods
-- Retorna usuários cujo grace period expirou e precisam de billing
-- ============================================================================

CREATE OR REPLACE FUNCTION get_expired_grace_periods()
RETURNS TABLE (
  user_id UUID,
  clerk_id TEXT,
  email TEXT,
  plan TEXT,
  grace_period_until TIMESTAMPTZ,
  auto_bill_after_grace BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.clerk_id,
    u.email,
    u.plan,
    u.grace_period_until,
    u.auto_bill_after_grace
  FROM users u
  WHERE
    u.grace_period_until IS NOT NULL
    AND u.grace_period_until < NOW()
    AND u.auto_bill_after_grace = true
    AND u.subscription_id IS NULL; -- Ainda não tem subscription no Stripe
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_expired_grace_periods() IS 'Retorna usuários com grace period expirado que precisam de billing automático';

-- ============================================================================
-- SAMPLE QUERY: Como ativar usuário com grace period
-- ============================================================================

-- Exemplo de ativação com grace period até 10 de janeiro de 2025:
/*
UPDATE users
SET
  is_paid = true,
  subscription_status = 'trialing',
  tools_unlocked = true,
  plan = 'pro',
  grace_period_until = '2025-01-10 23:59:59+00'::TIMESTAMPTZ,
  auto_bill_after_grace = true
WHERE clerk_id = 'user_xxxxx';
*/

-- ============================================================================
-- ROLLBACK (se necessário)
-- ============================================================================

-- Para reverter essa migration:
/*
DROP FUNCTION IF EXISTS get_expired_grace_periods();
DROP INDEX IF EXISTS idx_users_grace_period;
ALTER TABLE users DROP COLUMN IF EXISTS auto_bill_after_grace;
ALTER TABLE users DROP COLUMN IF EXISTS grace_period_until;
*/
