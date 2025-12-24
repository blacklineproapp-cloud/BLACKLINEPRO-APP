-- ============================================
-- MIGRAÇÕES STENCILFLOW - SISTEMA DE CRÉDITOS
-- Versão Final e Funcional
-- ============================================

-- ============================================
-- 1. CRIAR ÍNDICES (Performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_id);

-- ============================================
-- 2. ADICIONAR CONSTRAINTS (Validações)
-- ============================================

-- Garantir que créditos não sejam negativos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE constraint_name = 'check_credits_non_negative'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT check_credits_non_negative CHECK (credits >= 0);
    END IF;
END $$;

-- Validar planos permitidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE constraint_name = 'check_plan_valid'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT check_plan_valid CHECK (plan IN ('free', 'pro', 'studio'));
    END IF;
END $$;

-- ============================================
-- 3. FUNÇÃO: Resetar Limites Mensais
-- ============================================

CREATE OR REPLACE FUNCTION public.reset_monthly_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.users
  SET usage_this_month = '{}'::jsonb,
      updated_at = NOW()
  WHERE plan IN ('free', 'pro');

  RAISE NOTICE '✅ Limites mensais resetados';
END;
$$;

-- ============================================
-- 4. FUNÇÃO: Obter Estatísticas do Usuário
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_usage_stats(user_clerk_id VARCHAR)
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
    COALESCE((u.usage_this_month->>'topographic')::INTEGER, 0),
    COALESCE((u.usage_this_month->>'lines')::INTEGER, 0),
    COALESCE((u.usage_this_month->>'ia_gen')::INTEGER, 0),
    COALESCE((u.usage_this_month->>'enhance')::INTEGER, 0),
    COALESCE((u.usage_this_month->>'color_match')::INTEGER, 0)
  FROM public.users u
  WHERE u.clerk_id = user_clerk_id;
END;
$$;

-- ============================================
-- 5. TRIGGER: Log de Mudanças de Plano
-- ============================================

CREATE OR REPLACE FUNCTION public.log_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    INSERT INTO public.plan_changes (user_id, old_plan, new_plan)
    VALUES (NEW.clerk_id, OLD.plan, NEW.plan);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_plan_change ON public.users;

CREATE TRIGGER trigger_log_plan_change
  AFTER UPDATE ON public.users
  FOR EACH ROW
  WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
  EXECUTE FUNCTION public.log_plan_change();

-- ============================================
-- 6. VIEWS DE ANALYTICS
-- ============================================

-- View: Uso diário por operação
CREATE OR REPLACE VIEW public.analytics_daily_usage AS
SELECT
  DATE(created_at) AS date,
  operation_type,
  COUNT(*) AS operations_count,
  SUM(credits_used) AS total_credits_used,
  SUM(cost_usd) AS total_cost_usd
FROM public.usage_logs
GROUP BY DATE(created_at), operation_type
ORDER BY date DESC;

-- View: Receita mensal
CREATE OR REPLACE VIEW public.analytics_monthly_revenue AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  type,
  COUNT(*) AS transactions_count,
  SUM(amount) AS total_credits_sold
FROM public.credit_transactions
WHERE type = 'purchase'
GROUP BY DATE_TRUNC('month', created_at), type
ORDER BY month DESC;

-- View: Usuários por plano
CREATE OR REPLACE VIEW public.analytics_users_by_plan AS
SELECT
  plan,
  COUNT(*) AS user_count,
  SUM(credits) AS total_credits,
  ROUND(AVG(credits))::INTEGER AS avg_credits_per_user
FROM public.users
GROUP BY plan;

-- ============================================
-- 7. TABELA DE VERIFICAÇÃO (VOCÊ PODE VER ESTA!)
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Registrar esta migração
INSERT INTO public.system_migrations (migration_name)
VALUES ('credits_system_v1')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. MOSTRAR RESULTADOS
-- ============================================

-- Listar todas as funções criadas
SELECT
  'Função criada: ' || routine_name as resultado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('reset_monthly_limits', 'get_user_usage_stats', 'log_plan_change')
ORDER BY routine_name;

-- Listar todas as views criadas
SELECT
  'View criada: ' || table_name as resultado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'VIEW'
  AND table_name LIKE 'analytics_%'
ORDER BY table_name;

-- Mostrar constraints adicionadas
SELECT
  'Constraint criada: ' || constraint_name as resultado
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND constraint_name LIKE 'check_%'
ORDER BY constraint_name;

-- ============================================
-- RESUMO FINAL
-- ============================================

DO $$
DECLARE
  func_count INTEGER;
  view_count INTEGER;
  constraint_count INTEGER;
BEGIN
  -- Contar funções
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('reset_monthly_limits', 'get_user_usage_stats', 'log_plan_change');

  -- Contar views
  SELECT COUNT(*) INTO view_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'VIEW'
    AND table_name LIKE 'analytics_%';

  -- Contar constraints
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND constraint_name LIKE 'check_%';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ MIGRAÇÕES APLICADAS COM SUCESSO!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Funções criadas: %', func_count;
  RAISE NOTICE 'Views criadas: %', view_count;
  RAISE NOTICE 'Constraints criadas: %', constraint_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Você pode ver:';
  RAISE NOTICE '  • Tabela: system_migrations';
  RAISE NOTICE '  • Views: analytics_daily_usage, analytics_monthly_revenue, analytics_users_by_plan';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Comandos úteis:';
  RAISE NOTICE '  • SELECT * FROM system_migrations;';
  RAISE NOTICE '  • SELECT * FROM analytics_users_by_plan;';
  RAISE NOTICE '  • SELECT * FROM get_user_usage_stats(''user_clerk_id'');';
  RAISE NOTICE '================================================';
END $$;
