-- =====================================================
-- MIGRATION 005: Prevenir Emails Duplicados
-- Data: 2025-12-29
-- =====================================================
--
-- ATENÇÃO: Execute APENAS DEPOIS de limpar duplicados!
-- Use o script FIX-DUPLICATE-USERS.sql primeiro
--
-- =====================================================

-- =====================================================
-- 1. VERIFICAR SE HÁ DUPLICADOS (deve retornar vazio)
-- =====================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT LOWER(email), COUNT(*) as cnt
    FROM users
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'ERRO: Ainda existem % emails duplicados. Execute FIX-DUPLICATE-USERS.sql primeiro!', duplicate_count;
  END IF;

  RAISE NOTICE '✅ Nenhum email duplicado encontrado. Prosseguindo...';
END $$;

-- =====================================================
-- 2. CRIAR ÍNDICE ÚNICO NO EMAIL (case-insensitive)
-- =====================================================

-- Criar índice único em LOWER(email) para prevenir duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
ON users (LOWER(email));

COMMENT ON INDEX idx_users_email_unique IS
'Índice único para prevenir emails duplicados (case-insensitive)';

RAISE NOTICE '✅ Índice único criado em users.email';

-- =====================================================
-- 3. ATUALIZAR CONSTRAINT DO CLERK_ID (já deve ser único)
-- =====================================================

-- Verificar se clerk_id já é UNIQUE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_clerk_id_key'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_clerk_id_key UNIQUE (clerk_id);
    RAISE NOTICE '✅ Constraint UNIQUE adicionada em clerk_id';
  ELSE
    RAISE NOTICE '✅ clerk_id já é UNIQUE';
  END IF;
END $$;

-- =====================================================
-- 4. CRIAR FUNÇÃO DE VALIDAÇÃO
-- =====================================================

-- Função para normalizar email antes de inserir/atualizar
CREATE OR REPLACE FUNCTION normalize_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalizar email: lowercase e trim
  NEW.email := LOWER(TRIM(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para normalizar email automaticamente
DROP TRIGGER IF EXISTS trigger_normalize_email ON users;
CREATE TRIGGER trigger_normalize_email
  BEFORE INSERT OR UPDATE OF email ON users
  FOR EACH ROW
  EXECUTE FUNCTION normalize_user_email();

COMMENT ON FUNCTION normalize_user_email IS
'Normaliza email para lowercase antes de inserir/atualizar';

RAISE NOTICE '✅ Trigger de normalização criado';

-- =====================================================
-- 5. VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  has_unique_email BOOLEAN;
  has_unique_clerk BOOLEAN;
BEGIN
  -- Verificar índice único no email
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_users_email_unique'
  ) INTO has_unique_email;

  -- Verificar constraint único no clerk_id
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_clerk_id_key'
  ) INTO has_unique_clerk;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAÇÃO 005 CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email UNIQUE: %', CASE WHEN has_unique_email THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'Clerk ID UNIQUE: %', CASE WHEN has_unique_clerk THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE 'A partir de agora:';
  RAISE NOTICE '- Não é possível criar usuários com emails duplicados';
  RAISE NOTICE '- Não é possível criar usuários com clerk_id duplicados';
  RAISE NOTICE '- Emails são automaticamente normalizados (lowercase)';
  RAISE NOTICE '========================================';

  IF NOT has_unique_email OR NOT has_unique_clerk THEN
    RAISE EXCEPTION 'Migração falhou! Verifique os erros acima.';
  END IF;
END $$;

-- =====================================================
-- FIM DA MIGRATION 005
-- =====================================================
