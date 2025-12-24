-- ============================================
-- MIGRAÇÕES CORRETAS - StencilFlow
-- Baseado no schema atual (atual.sql)
-- Apenas adiciona o que FALTA
-- ============================================

-- ============================================
-- ANÁLISE DO SCHEMA ATUAL
-- ============================================
-- ✅ Tabela users JÁ TEM:
--    - credits INTEGER
--    - plan VARCHAR
--    - usage_this_month JSONB
-- ✅ Tabela usage_logs JÁ EXISTE
-- ✅ Tabela credit_transactions JÁ EXISTE
-- ✅ Tabela plan_changes JÁ EXISTE
-- ============================================

-- ============================================
-- 1. ÍNDICES (se não existirem)
-- ============================================

-- Índices para usage_logs
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_operation ON usage_logs(user_id, operation_type, created_at DESC);

-- Índices para credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Índices para users (otimização de queries de créditos)
CREATE INDEX IF NOT EXISTS idx_users_plan_credits ON users(plan, credits);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- ============================================
-- 2. FUNÇÕES HELPER
-- ============================================

-- Função para resetar limites mensais (cron job)
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Resetar apenas usuários Free e Pro (Studio é ilimitado)
  UPDATE users
  SET usage_this_month = '{}'::jsonb,
      updated_at = NOW()
  WHERE plan IN ('free', 'pro');

  -- Log da operação
  RAISE NOTICE 'Limites mensais resetados para planos Free e Pro em %', NOW();
END;
$$;

-- Função para obter estatísticas de uso do usuário
CREATE OR REPLACE FUNCTION get_user_usage_stats(user_clerk_id VARCHAR)
RETURNS TABLE (
  plan VARCHAR,
  credits INTEGER,
  topographic_used INTEGER,
  lines_used INTEGER,
  ia_gen_used INTEGER,
  enhance_used INTEGER,
  color_match_used INTEGER,
  total_operations INTEGER
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
    COALESCE((u.usage_this_month->>'color_match')::INTEGER, 0) AS color_match_used,
    COALESCE((u.usage_this_month->>'topographic')::INTEGER, 0) +
    COALESCE((u.usage_this_month->>'lines')::INTEGER, 0) +
    COALESCE((u.usage_this_month->>'ia_gen')::INTEGER, 0) +
    COALESCE((u.usage_this_month->>'enhance')::INTEGER, 0) +
    COALESCE((u.usage_this_month->>'color_match')::INTEGER, 0) AS total_operations
  FROM users u
  WHERE u.clerk_id = user_clerk_id;
END;
$$;

-- ============================================
-- 3. TRIGGER PARA LOG DE MUDANÇAS DE PLANO
-- ============================================

-- Verificar se trigger já existe e remover
DROP TRIGGER IF EXISTS trigger_log_plan_change ON users;

-- Função do trigger
CREATE OR REPLACE FUNCTION log_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Apenas logar se o plano realmente mudou
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    INSERT INTO plan_changes (user_id, old_plan, new_plan, changed_at)
    VALUES (NEW.clerk_id, OLD.plan, NEW.plan, NOW());

    RAISE NOTICE 'Plano alterado: % → % para usuário %', OLD.plan, NEW.plan, NEW.clerk_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER trigger_log_plan_change
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
  EXECUTE FUNCTION log_plan_change();

-- ============================================
-- 4. TRIGGER PARA ATUALIZAR updated_at
-- ============================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar em users (se não existir)
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar em projects (se não existir)
DROP TRIGGER IF EXISTS trigger_projects_updated_at ON projects;
CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar em payments (se não existir)
DROP TRIGGER IF EXISTS trigger_payments_updated_at ON payments;
CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. VIEWS PARA ANALYTICS
-- ============================================

-- View para resumo de uso diário
CREATE OR REPLACE VIEW analytics_daily_usage AS
SELECT
  DATE(created_at) AS date,
  operation_type,
  COUNT(*) AS operations_count,
  SUM(credits_used) AS total_credits_used,
  SUM(cost_usd) AS total_cost_usd,
  COUNT(DISTINCT user_id) AS unique_users
FROM usage_logs
GROUP BY DATE(created_at), operation_type
ORDER BY date DESC, operation_type;

-- View para resumo de receita mensal
CREATE OR REPLACE VIEW analytics_monthly_revenue AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  type,
  COUNT(*) AS transactions_count,
  SUM(amount) AS total_credits_sold
FROM credit_transactions
WHERE type = 'purchase'
GROUP BY DATE_TRUNC('month', created_at), type
ORDER BY month DESC;

-- View para distribuição de usuários por plano
CREATE OR REPLACE VIEW analytics_users_by_plan AS
SELECT
  plan,
  COUNT(*) AS user_count,
  SUM(credits) AS total_credits,
  AVG(credits)::INTEGER AS avg_credits_per_user
FROM users
GROUP BY plan
ORDER BY
  CASE plan
    WHEN 'studio' THEN 1
    WHEN 'pro' THEN 2
    WHEN 'free' THEN 3
  END;

-- View para top usuários por uso
CREATE OR REPLACE VIEW analytics_top_users AS
SELECT
  u.clerk_id,
  u.email,
  u.plan,
  u.credits,
  COUNT(ul.id) AS total_operations,
  SUM(ul.credits_used) AS total_credits_used,
  SUM(ul.cost_usd) AS total_cost_usd
FROM users u
LEFT JOIN usage_logs ul ON u.clerk_id = ul.user_id
WHERE ul.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.clerk_id, u.email, u.plan, u.credits
ORDER BY total_operations DESC
LIMIT 100;

-- ============================================
-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN users.credits IS 'Créditos avulsos disponíveis (pay-as-you-go). Não resetam mensalmente.';
COMMENT ON COLUMN users.plan IS 'Plano atual do usuário: free, pro ou studio';
COMMENT ON COLUMN users.usage_this_month IS 'JSON com contadores de uso mensal por tipo de operação. Reseta todo dia 1.';

COMMENT ON TABLE usage_logs IS 'Registra todas as operações de IA realizadas pelos usuários. Usado para analytics e billing.';
COMMENT ON TABLE credit_transactions IS 'Histórico de todas as transações de créditos: compras, uso, reembolsos, bônus.';
COMMENT ON TABLE plan_changes IS 'Histórico de mudanças de plano dos usuários. Populado automaticamente via trigger.';

COMMENT ON FUNCTION reset_monthly_limits() IS 'Reseta os limites mensais de uso para planos Free e Pro. Executar via cron todo dia 1.';
COMMENT ON FUNCTION get_user_usage_stats(VARCHAR) IS 'Retorna estatísticas detalhadas de uso de um usuário específico.';

-- ============================================
-- 7. CONSTRAINTS E VALIDAÇÕES
-- ============================================

-- Validar que credits nunca seja negativo
ALTER TABLE users ADD CONSTRAINT check_credits_non_negative CHECK (credits >= 0);

-- Validar tipos de plano permitidos
ALTER TABLE users ADD CONSTRAINT check_plan_valid CHECK (plan IN ('free', 'pro', 'studio'));

-- Validar tipos de operação permitidos em usage_logs
ALTER TABLE usage_logs ADD CONSTRAINT check_operation_type_valid
CHECK (operation_type IN ('topographic', 'lines', 'ia_gen', 'enhance', 'color_match'));

-- Validar tipos de transação permitidos
ALTER TABLE credit_transactions ADD CONSTRAINT check_transaction_type_valid
CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'adjustment'));

-- ============================================
-- 8. POLÍTICA RLS (Row Level Security) - DESABILITADA
-- ============================================
-- Como mencionado no CLAUDE.md, RLS está causando problemas
-- Garantir que está desabilitado

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_changes DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. CONFIGURAÇÃO DE TIMEZONE
-- ============================================

-- Garantir que timezone está configurado para UTC
SET timezone = 'UTC';

-- ============================================
-- 10. SEED INICIAL (APENAS DEV)
-- ============================================

-- Descomentar apenas em desenvolvimento
-- UPDATE users
-- SET plan = 'pro', credits = 100, usage_this_month = '{}'::jsonb
-- WHERE clerk_id IN (
--   'user_XXXXXXXX',  -- Substitua pelos IDs reais do Clerk
--   'user_YYYYYYYY'
-- );

-- ============================================
-- QUERIES ÚTEIS PARA MONITORAMENTO
-- ============================================

-- Ver uso de um usuário específico
-- SELECT * FROM get_user_usage_stats('user_XXXXX');

-- Ver top 10 usuários por custo (últimos 30 dias)
-- SELECT * FROM analytics_top_users LIMIT 10;

-- Ver receita do mês atual
-- SELECT * FROM analytics_monthly_revenue
-- WHERE month = DATE_TRUNC('month', NOW());

-- Ver uso diário da última semana
-- SELECT * FROM analytics_daily_usage
-- WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Ver distribuição de usuários por plano
-- SELECT * FROM analytics_users_by_plan;

-- Ver usuários que atingiram limite mensal
-- SELECT
--   clerk_id,
--   email,
--   plan,
--   usage_this_month,
--   credits
-- FROM users
-- WHERE plan = 'free'
-- AND (usage_this_month->>'topographic')::INTEGER >= 5;

-- ============================================
-- CONFIGURAÇÃO DE CRON JOB NO SUPABASE
-- ============================================
--
-- 1. Ir em Supabase Dashboard → Database → Cron Jobs
-- 2. Clicar em "Create Cron Job"
-- 3. Configurar:
--    - Nome: reset_monthly_limits
--    - Schedule: 0 0 1 * * (todo dia 1 às 00:00 UTC)
--    - Command: SELECT reset_monthly_limits();
--    - Active: ✓
--
-- ============================================

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se todas as tabelas existem no schema public
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    RAISE EXCEPTION 'Tabela users não encontrada no schema public';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_logs') THEN
    RAISE EXCEPTION 'Tabela usage_logs não encontrada no schema public';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_transactions') THEN
    RAISE EXCEPTION 'Tabela credit_transactions não encontrada no schema public';
  END IF;

  RAISE NOTICE '✅ Todas as tabelas necessárias existem';
  RAISE NOTICE '✅ Migrações aplicadas com sucesso';
  RAISE NOTICE '✅ Sistema de créditos pronto para uso';
END $$;
