-- ============================================
-- SCRIPT PARA CRIAR ADMIN MANUALMENTE
-- ============================================
--
-- IMPORTANTE: Use este script apenas se você não conseguir
-- acessar a página /admin-bootstrap ou preferir fazer manualmente.
--
-- INSTRUÇÕES:
-- 1. Faça login no Supabase Dashboard
-- 2. Vá em SQL Editor
-- 3. Substitua 'SEU_CLERK_ID_AQUI' pelo seu Clerk ID
-- 4. Execute este script
--
-- Como encontrar seu Clerk ID:
-- - Faça login no app
-- - Abra o console do navegador (F12)
-- - Digite: await (await fetch('/api/user/status')).json()
-- - Copie o valor de "clerk_id"
-- ============================================

-- Verificar se já existem admins
SELECT
  COUNT(*) as total_admins,
  ARRAY_AGG(user_id) as admin_ids
FROM admin_users;

-- Se total_admins = 0, você pode criar o primeiro admin:

-- SUBSTITUA 'SEU_CLERK_ID_AQUI' pelo seu Clerk ID real!
DO $$
DECLARE
  v_clerk_id VARCHAR := 'SEU_CLERK_ID_AQUI'; -- ⚠️ SUBSTITUA AQUI!
  v_user_email VARCHAR;
  v_admin_count INTEGER;
BEGIN
  -- Verificar se já existem admins
  SELECT COUNT(*) INTO v_admin_count FROM admin_users;

  IF v_admin_count > 0 THEN
    RAISE NOTICE '⚠️  AVISO: Já existem % admin(s) no sistema!', v_admin_count;
    RAISE NOTICE 'Entre em contato com um admin existente para obter permissões.';
    RETURN;
  END IF;

  -- Buscar email do usuário
  SELECT email INTO v_user_email
  FROM users
  WHERE clerk_id = v_clerk_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION '❌ Usuário com clerk_id = % não encontrado!', v_clerk_id;
  END IF;

  -- Criar admin
  INSERT INTO admin_users (user_id, role, granted_by, granted_at, expires_at, notes)
  VALUES (
    v_clerk_id,
    'superadmin',
    NULL, -- Bootstrap manual
    NOW(),
    NULL, -- Permanente
    'Admin criado manualmente via SQL'
  );

  RAISE NOTICE '✅ SUCESSO! % agora é SUPERADMIN!', v_user_email;
END $$;

-- Verificar resultado
SELECT
  au.user_id,
  u.email,
  au.role,
  au.granted_at,
  au.expires_at,
  CASE
    WHEN au.expires_at IS NULL THEN 'Permanente'
    WHEN au.expires_at > NOW() THEN 'Ativo até ' || au.expires_at::TEXT
    ELSE 'Expirado'
  END as status
FROM admin_users au
JOIN users u ON u.clerk_id = au.user_id
ORDER BY au.granted_at DESC;
