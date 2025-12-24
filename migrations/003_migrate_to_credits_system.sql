-- ============================================
-- MIGRAÇÃO PARA SISTEMA DE CRÉDITOS
-- StencilFlow v2.0
-- ============================================
--
-- INSTRUÇÕES:
-- 1. Faça backup do banco antes de executar
-- 2. Execute no Supabase Dashboard → SQL Editor
-- 3. Pode executar tudo de uma vez
-- ============================================

-- ============================================
-- 1. ADICIONAR NOVOS CAMPOS EM USERS
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_this_month JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS daily_usage JSONB DEFAULT '{}';

-- Comentários
COMMENT ON COLUMN users.plan IS 'Plano atual: starter, pro, studio';
COMMENT ON COLUMN users.credits IS 'Créditos avulsos comprados (além do plano)';
COMMENT ON COLUMN users.usage_this_month IS 'Uso mensal por operação: {topographic: 5, lines: 3, ...}';
COMMENT ON COLUMN users.daily_usage IS 'Uso diário: {2025-12-23: 10, 2025-12-24: 5, ...}';

-- ============================================
-- 2. MIGRAR DADOS ANTIGOS (SE EXISTIREM)
-- ============================================

-- Migrar usuários antigos para novo sistema
UPDATE users
SET plan = CASE
  WHEN subscription_status = 'active' AND is_paid = true THEN 'pro'
  WHEN subscription_status = 'canceled' OR is_paid = false THEN 'starter'
  ELSE 'starter'
END
WHERE plan IS NULL OR plan = '';

-- ============================================
-- 3. CRIAR TABELAS DE LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,  -- Clerk ID
  operation_type VARCHAR(50) NOT NULL,  -- topographic, lines, ia_gen, enhance, color_match
  credits_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,  -- Clerk ID
  amount INTEGER NOT NULL,  -- Quantidade de créditos
  type VARCHAR(20) NOT NULL,  -- 'purchase', 'refund', 'bonus'
  stripe_payment_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE usage_logs IS 'Log de todas operações realizadas pelos usuários';
COMMENT ON TABLE credit_transactions IS 'Histórico de compras e transações de créditos';

-- ============================================
-- 4. CRIAR ÍNDICES ESSENCIAIS
-- ============================================

-- Índices para USERS (sistema de créditos)
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_credits ON users(credits) WHERE credits > 0;
CREATE INDEX IF NOT EXISTS idx_users_plan_credits ON users(plan, credits);

-- Índices para USAGE_LOGS
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_operation ON usage_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_operation_date
  ON usage_logs(user_id, operation_type, created_at DESC);

-- Índices para CREDIT_TRANSACTIONS
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_stripe ON credit_transactions(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

-- ============================================
-- 5. ATUALIZAR VIEW DO ADMIN DASHBOARD
-- ============================================

-- Remover view antiga (se existir)
DROP VIEW IF EXISTS admin_dashboard_stats;

-- Criar view nova compatível com sistema de créditos
CREATE OR REPLACE VIEW admin_dashboard_stats_v2 AS
SELECT
  -- Total de usuários
  (SELECT COUNT(*) FROM users) as total_users,

  -- Usuários por plano
  (SELECT COUNT(*) FROM users WHERE plan = 'starter') as starter_users,
  (SELECT COUNT(*) FROM users WHERE plan = 'pro') as pro_users,
  (SELECT COUNT(*) FROM users WHERE plan = 'studio') as studio_users,

  -- Total de projetos criados
  (SELECT COUNT(*) FROM projects) as total_projects,

  -- Receita total (soma de pagamentos bem-sucedidos)
  (SELECT COALESCE(SUM(amount), 0) FROM payments
   WHERE status = 'succeeded') as total_revenue,

  -- Operações hoje
  (SELECT COUNT(*) FROM usage_logs
   WHERE created_at >= CURRENT_DATE) as operations_today,

  -- Custo total de IA (USD)
  (SELECT COALESCE(SUM(cost_usd), 0) FROM usage_logs) as total_cost_usd,

  -- Novos usuários nos últimos 7 dias
  (SELECT COUNT(*) FROM users
   WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_week,

  -- Créditos vendidos este mês
  (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions
   WHERE type = 'purchase'
   AND created_at >= date_trunc('month', CURRENT_DATE)) as credits_sold_month,

  -- Operações por tipo hoje
  (SELECT COUNT(*) FROM usage_logs
   WHERE operation_type = 'topographic'
   AND created_at >= CURRENT_DATE) as topographic_today,

  (SELECT COUNT(*) FROM usage_logs
   WHERE operation_type = 'lines'
   AND created_at >= CURRENT_DATE) as lines_today,

  (SELECT COUNT(*) FROM usage_logs
   WHERE operation_type = 'ia_gen'
   AND created_at >= CURRENT_DATE) as ia_gen_today,

  (SELECT COUNT(*) FROM usage_logs
   WHERE operation_type = 'enhance'
   AND created_at >= CURRENT_DATE) as enhance_today,

  (SELECT COUNT(*) FROM usage_logs
   WHERE operation_type = 'color_match'
   AND created_at >= CURRENT_DATE) as color_match_today;

-- Comentário da view
COMMENT ON VIEW admin_dashboard_stats_v2 IS
'Dashboard administrativo otimizado para sistema de créditos. Todas estatísticas em 1 query.';

-- ============================================
-- 6. CONFIGURAR AUTOVACUUM OTIMIZADO
-- ============================================

-- usage_logs cresce rápido, precisa de vacuum frequente
ALTER TABLE usage_logs SET (
  autovacuum_vacuum_scale_factor = 0.05,  -- Vacuum quando 5% mudou
  autovacuum_analyze_scale_factor = 0.02  -- Analyze quando 2% mudou
);

-- credit_transactions é mais estável
ALTER TABLE credit_transactions SET (
  autovacuum_vacuum_scale_factor = 0.1
);

-- ============================================
-- 7. FUNÇÕES AUXILIARES
-- ============================================

-- Função para resetar limites mensais (executar todo dia 1)
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET usage_this_month = '{}'
  WHERE plan IN ('starter', 'pro');

  RAISE NOTICE 'Limites mensais resetados para planos starter e pro';
END;
$$;

-- Comentário
COMMENT ON FUNCTION reset_monthly_limits IS
'Executar todo dia 1 do mês via cron. Reseta usage_this_month para usuários starter e pro.';

-- ============================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================

DO $$
DECLARE
  v_users_count INTEGER;
  v_has_plan BOOLEAN;
  v_has_usage_logs BOOLEAN;
  v_has_credit_transactions BOOLEAN;
BEGIN
  -- Verificar se users tem os novos campos
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'plan'
  ) INTO v_has_plan;

  -- Verificar se tabelas foram criadas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'usage_logs'
  ) INTO v_has_usage_logs;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'credit_transactions'
  ) INTO v_has_credit_transactions;

  -- Contar usuários migrados
  SELECT COUNT(*) INTO v_users_count FROM users WHERE plan IS NOT NULL;

  -- Reportar resultados
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Campo users.plan: %', CASE WHEN v_has_plan THEN '✅ OK' ELSE '❌ ERRO' END;
  RAISE NOTICE 'Tabela usage_logs: %', CASE WHEN v_has_usage_logs THEN '✅ OK' ELSE '❌ ERRO' END;
  RAISE NOTICE 'Tabela credit_transactions: %', CASE WHEN v_has_credit_transactions THEN '✅ OK' ELSE '❌ ERRO' END;
  RAISE NOTICE 'Usuários migrados: %', v_users_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Execute: SELECT * FROM admin_dashboard_stats_v2;';
  RAISE NOTICE '2. Execute: IMPLEMENTACAO_CUPONS.sql (sistema de cupons)';
  RAISE NOTICE '3. Configure monitoramento Prometheus';
  RAISE NOTICE '========================================';

  -- Validação
  IF NOT v_has_plan OR NOT v_has_usage_logs OR NOT v_has_credit_transactions THEN
    RAISE EXCEPTION 'Migração falhou! Verifique os erros acima.';
  END IF;
END $$;
