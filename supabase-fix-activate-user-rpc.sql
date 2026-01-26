-- ============================================================================
-- CORREÇÃO: Função RPC activate_user_with_reset
--
-- Esta função precisa ser executada no Supabase Dashboard > SQL Editor
--
-- BUG CORRIGIDO: A função original não salvava subscription_id e
-- subscription_expires_at, causando inconsistências nos dados do usuário
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS activate_user_with_reset(
  p_user_id UUID,
  p_new_plan TEXT,
  p_is_paid BOOLEAN,
  p_tools_unlocked BOOLEAN,
  p_subscription_status TEXT,
  p_admin_id UUID
);

-- Create updated function with subscription fields
CREATE OR REPLACE FUNCTION activate_user_with_reset(
  p_user_id UUID,
  p_new_plan TEXT,
  p_is_paid BOOLEAN,
  p_tools_unlocked BOOLEAN,
  p_subscription_status TEXT,
  p_admin_id UUID DEFAULT NULL,
  p_subscription_id TEXT DEFAULT NULL,
  p_subscription_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  deleted_records INTEGER,
  old_plan TEXT,
  new_plan TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_plan TEXT;
  v_deleted_count INTEGER := 0;
  v_was_blocked BOOLEAN;
  v_first_day_of_month TIMESTAMPTZ;
BEGIN
  -- Lock row to prevent race conditions
  SELECT plan INTO v_old_plan
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      0::INTEGER,
      NULL::TEXT,
      p_new_plan,
      'Usuário não encontrado'::TEXT;
    RETURN;
  END IF;

  -- Check if user was blocked (free or null plan)
  v_was_blocked := (v_old_plan IS NULL OR v_old_plan = 'free');

  -- If was blocked, reset monthly usage
  IF v_was_blocked THEN
    v_first_day_of_month := date_trunc('month', NOW());

    DELETE FROM ai_usage
    WHERE user_id = p_user_id
      AND created_at >= v_first_day_of_month;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;

  -- Update user with all fields including subscription info
  UPDATE users
  SET
    plan = p_new_plan,
    is_paid = p_is_paid,
    tools_unlocked = p_tools_unlocked,
    subscription_status = p_subscription_status,
    subscription_id = COALESCE(p_subscription_id, subscription_id),
    subscription_expires_at = COALESCE(p_subscription_expires_at, subscription_expires_at),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log if admin action
  IF p_admin_id IS NOT NULL THEN
    INSERT INTO admin_logs (admin_user_id, action, target_user_id, details)
    VALUES (
      p_admin_id,
      'user_activation_atomic',
      p_user_id,
      jsonb_build_object(
        'old_plan', v_old_plan,
        'new_plan', p_new_plan,
        'deleted_usage_records', v_deleted_count
      )
    );
  END IF;

  RETURN QUERY SELECT
    TRUE::BOOLEAN,
    v_deleted_count::INTEGER,
    v_old_plan,
    p_new_plan,
    format('Ativado de %s → %s (%s registros resetados)',
           COALESCE(v_old_plan, 'null'),
           p_new_plan,
           v_deleted_count)::TEXT;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION activate_user_with_reset TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION activate_user_with_reset IS
'Ativa usuário atomicamente com reset de limites mensais.
Parâmetros opcionais p_subscription_id e p_subscription_expires_at
permitem atualizar dados de subscription junto com a ativação.
ATUALIZADO: 2026-01-19 - Adicionados campos de subscription';
