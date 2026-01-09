-- =====================================================
-- MIGRATION 009: Ativação Atômica de Usuários
-- Descrição: Função PostgreSQL para ativar usuário com transação ACID
-- Resolve: Bug de limites não liberados + race conditions
-- Data: 2026-01-09
-- =====================================================

CREATE OR REPLACE FUNCTION activate_user_with_reset(
  p_user_id UUID,
  p_new_plan VARCHAR,
  p_is_paid BOOLEAN,
  p_tools_unlocked BOOLEAN,
  p_subscription_status VARCHAR,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  deleted_records INTEGER,
  old_plan VARCHAR,
  new_plan VARCHAR,
  message TEXT
) AS $$
DECLARE
  v_old_plan VARCHAR;
  v_deleted_count INTEGER := 0;
  v_first_day_of_month TIMESTAMP;
BEGIN
  -- Calcular primeiro dia do mês
  v_first_day_of_month := DATE_TRUNC('month', NOW());

  -- 1. SELECT com row-level lock (previne race condition)
  -- FOR UPDATE bloqueia a linha até o COMMIT, impedindo modificações concorrentes
  SELECT plan INTO v_old_plan
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, NULL::VARCHAR, NULL::VARCHAR, 'Usuário não encontrado';
    RETURN;
  END IF;

  -- 2. Resetar uso APENAS se era FREE (dentro da mesma transação ACID)
  -- Se usuário estava em plano bloqueado (FREE/NULL), deletar tentativas bloqueadas
  -- Se estava em plano pago, preservar histórico (upgrade entre planos)
  IF v_old_plan IS NULL OR v_old_plan = 'free' THEN
    DELETE FROM ai_usage
    WHERE user_id = p_user_id
      AND created_at >= v_first_day_of_month;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE '[Activate] Resetado % registros de uso (usuário estava bloqueado)', v_deleted_count;
  ELSE
    RAISE NOTICE '[Activate] Histórico preservado (upgrade entre planos: % → %)', v_old_plan, p_new_plan;
  END IF;

  -- 3. Atualizar usuário (dentro da mesma transação)
  -- Se DELETE falhou acima, UPDATE também não executa (rollback automático)
  UPDATE users
  SET
    plan = p_new_plan,
    is_paid = p_is_paid,
    tools_unlocked = p_tools_unlocked,
    subscription_status = p_subscription_status,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 4. Log admin (se fornecido) para auditoria
  IF p_admin_id IS NOT NULL THEN
    INSERT INTO admin_logs (admin_user_id, action, target_user_id, details)
    VALUES (
      p_admin_id,
      'activate_user_atomic',
      p_user_id,
      jsonb_build_object(
        'old_plan', v_old_plan,
        'new_plan', p_new_plan,
        'deleted_records', v_deleted_count
      )
    );
  END IF;

  -- 5. Retornar resultado
  RETURN QUERY SELECT
    TRUE,
    v_deleted_count,
    v_old_plan,
    p_new_plan,
    FORMAT('Ativado de %s → %s (%s registros resetados)', v_old_plan, p_new_plan, v_deleted_count);

  -- COMMIT implícito ao final da função (transação ACID completa)

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de QUALQUER erro, rollback automático
    RAISE NOTICE '[Activate] Erro: % - Rollback automático executado', SQLERRM;
    RETURN QUERY SELECT FALSE, 0, NULL::VARCHAR, NULL::VARCHAR, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION activate_user_with_reset IS 'Ativa usuário com reset de uso em transação atômica (ACID). Previne race conditions via FOR UPDATE e garante rollback em caso de erro.';

-- Criar índice se não existir (melhora performance do FOR UPDATE)
CREATE INDEX IF NOT EXISTS idx_users_id_plan ON users(id, plan);

-- Comentário adicional
COMMENT ON INDEX idx_users_id_plan IS 'Otimiza queries de ativação com FOR UPDATE lock';
