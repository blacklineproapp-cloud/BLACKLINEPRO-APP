-- ============================================
-- MIGRAÇÕES PARA SISTEMA DE CRÉDITOS
-- StencilFlow v2.0
-- ============================================

-- 1. Adicionar colunas na tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS usage_this_month JSONB DEFAULT '{}';

-- 2. Criar tabela de logs de uso
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  credits_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- 3. Criar tabela de transações de créditos
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL,  -- 'purchase', 'usage', 'refund', 'bonus'
  stripe_payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

-- 4. Função para resetar limites mensais (executar todo dia 1)
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Resetar apenas usuários Free e Pro (Studio é ilimitado)
  UPDATE users
  SET usage_this_month = '{}'::jsonb
  WHERE plan IN ('free', 'pro');

  -- Registrar no log
  RAISE NOTICE 'Limites mensais resetados em %', NOW();
END;
$$;

-- 5. Função helper para obter uso do usuário
CREATE OR REPLACE FUNCTION get_user_usage(user_clerk_id VARCHAR)
RETURNS TABLE (
  plan VARCHAR,
  credits INTEGER,
  topographic_used INTEGER,
  lines_used INTEGER,
  ia_gen_used INTEGER,
  enhance_used INTEGER,
  color_match_used INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.plan,
    u.credits,
    COALESCE((u.usage_this_month->>'topographic')::INTEGER, 0) AS topographic_used,
    COALESCE((u.usage_this_month->>'lines')::INTEGER, 0) AS lines_used,
    COALESCE((u.usage_this_month->>'ia_gen')::INTEGER, 0) AS ia_gen_used,
    COALESCE((u.usage_this_month->>'enhance')::INTEGER, 0) AS enhance_used,
    COALESCE((u.usage_this_month->>'color_match')::INTEGER, 0) AS color_match_used
  FROM users u
  WHERE u.clerk_id = user_clerk_id;
END;
$$;

-- 6. Trigger para registrar alterações de plano
CREATE TABLE IF NOT EXISTS plan_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  old_plan VARCHAR(20),
  new_plan VARCHAR(20),
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    INSERT INTO plan_changes (user_id, old_plan, new_plan)
    VALUES (NEW.clerk_id, OLD.plan, NEW.plan);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_plan_change
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
  EXECUTE FUNCTION log_plan_change();

-- 7. View para analytics (dashboard admin)
CREATE OR REPLACE VIEW analytics_usage_summary AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  operation_type,
  COUNT(*) AS operations_count,
  SUM(credits_used) AS total_credits_used,
  SUM(cost_usd) AS total_cost_usd
FROM usage_logs
GROUP BY DATE_TRUNC('day', created_at), operation_type
ORDER BY date DESC;

-- 8. View para revenue tracking
CREATE OR REPLACE VIEW analytics_revenue AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  type,
  COUNT(*) AS transactions_count,
  SUM(amount) AS total_credits_sold
FROM credit_transactions
WHERE type = 'purchase'
GROUP BY DATE_TRUNC('month', created_at), type
ORDER BY month DESC;

-- 9. Índices compostos para queries complexas
CREATE INDEX IF NOT EXISTS idx_users_plan_credits ON users(plan, credits);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_operation ON usage_logs(user_id, operation_type, created_at DESC);

-- 10. Comentários para documentação
COMMENT ON TABLE usage_logs IS 'Registra todas as operações de IA realizadas pelos usuários';
COMMENT ON TABLE credit_transactions IS 'Histórico de compras e uso de créditos';
COMMENT ON COLUMN users.credits IS 'Créditos avulsos disponíveis (pay-as-you-go)';
COMMENT ON COLUMN users.plan IS 'Plano atual: free, pro ou studio';
COMMENT ON COLUMN users.usage_this_month IS 'JSON com contadores de uso mensal por operação';

-- 11. Seed inicial (opcional - apenas dev)
-- UPDATE users SET plan = 'pro', credits = 100 WHERE clerk_id IN (
--   'user_XXXXXXXXXXXXXXXX',  -- ID do Clerk
--   'user_YYYYYYYYYYYYYYYY'
-- );

-- ============================================
-- QUERIES ÚTEIS PARA MONITORAMENTO
-- ============================================

-- Ver uso do usuário
-- SELECT * FROM get_user_usage('user_XXXXX');

-- Top 10 usuários por consumo
-- SELECT user_id, COUNT(*) as operations, SUM(cost_usd) as total_cost
-- FROM usage_logs
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY user_id
-- ORDER BY total_cost DESC
-- LIMIT 10;

-- Revenue do mês
-- SELECT * FROM analytics_revenue WHERE month >= DATE_TRUNC('month', NOW());

-- Uso por operação (últimos 30 dias)
-- SELECT * FROM analytics_usage_summary WHERE date >= NOW() - INTERVAL '30 days';

-- ============================================
-- CRON JOB (Configurar no Supabase Dashboard)
-- ============================================
--
-- 1. Ir em Database → Cron Jobs
-- 2. Criar novo job:
--    Nome: reset_monthly_limits
--    Schedule: 0 0 1 * *  (todo dia 1 às 00:00 UTC)
--    Command: SELECT reset_monthly_limits();
--
-- ============================================
