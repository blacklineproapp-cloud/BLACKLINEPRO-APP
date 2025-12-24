-- ============================================
-- FIX PARA USUÁRIOS EXISTENTES
-- StencilFlow - Corrigir dados após migração
-- ============================================
--
-- Este script atualiza usuários que foram criados ANTES
-- da migração 003 e ainda não têm os novos campos preenchidos
--
-- ============================================

-- 1. Atualizar usuários que não têm plano definido
UPDATE users
SET plan = CASE
  -- Se tem assinatura ativa, considerar pro
  WHEN subscription_status = 'active' AND is_paid = true THEN 'pro'
  -- Senão, starter
  ELSE 'starter'
END
WHERE plan IS NULL OR plan = '';

-- 2. Garantir que credits nunca seja NULL
UPDATE users
SET credits = 0
WHERE credits IS NULL;

-- 3. Garantir que usage_this_month nunca seja NULL
UPDATE users
SET usage_this_month = '{}'::jsonb
WHERE usage_this_month IS NULL;

-- 4. Garantir que daily_usage nunca seja NULL
UPDATE users
SET daily_usage = '{}'::jsonb
WHERE daily_usage IS NULL;

-- 5. Verificação final
DO $$
DECLARE
  v_users_fixed INTEGER;
  v_users_without_plan INTEGER;
BEGIN
  -- Contar usuários corrigidos
  SELECT COUNT(*) INTO v_users_fixed
  FROM users
  WHERE plan IS NOT NULL;

  -- Verificar se ainda há usuários sem plano
  SELECT COUNT(*) INTO v_users_without_plan
  FROM users
  WHERE plan IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORREÇÃO DE USUÁRIOS CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuários com plano: %', v_users_fixed;
  RAISE NOTICE 'Usuários SEM plano: %', v_users_without_plan;

  IF v_users_without_plan > 0 THEN
    RAISE WARNING 'Ainda há % usuários sem plano!', v_users_without_plan;
  ELSE
    RAISE NOTICE '✅ Todos usuários corrigidos!';
  END IF;

  RAISE NOTICE '========================================';
END $$;
