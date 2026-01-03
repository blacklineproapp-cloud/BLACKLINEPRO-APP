-- ============================================================================
-- Script: Popular ip_signups com dados históricos
-- Descrição: Importa signups antigos para análise retroativa de abuso
-- ============================================================================

-- IMPORTANTE: Este script deve ser executado APÓS a migration 008

-- 1. Popular ip_signups com usuários existentes
-- Nota: Como não temos IP histórico, vamos marcar como 'unknown' 
-- e permitir que o sistema rastreie apenas novos signups

-- Opção A: Se você TEM logs de IP (ex: tabela de logs, Vercel logs, etc)
-- Adapte esta query para sua fonte de dados:
/*
INSERT INTO ip_signups (ip_address, email, clerk_id, user_id, created_at, is_blocked)
SELECT 
  COALESCE(logs.ip_address, 'unknown') as ip_address,
  u.email,
  u.clerk_id,
  u.id as user_id,
  u.created_at,
  false as is_blocked
FROM users u
LEFT JOIN your_logs_table logs ON logs.user_id = u.id AND logs.action = 'signup'
WHERE NOT EXISTS (
  SELECT 1 FROM ip_signups WHERE clerk_id = u.clerk_id
);
*/

-- Opção B: Se NÃO TEM logs de IP (mais comum)
-- Marcar todos como 'historical' para não afetar análise de novos usuários
INSERT INTO ip_signups (ip_address, email, clerk_id, user_id, created_at, is_blocked, metadata)
SELECT 
  'historical' as ip_address,  -- Marca como histórico
  email,
  clerk_id,
  id as user_id,
  created_at,
  false as is_blocked,
  jsonb_build_object(
    'imported_at', NOW(),
    'source', 'historical_import',
    'note', 'Usuário existente antes da implementação do sistema anti-abuso'
  ) as metadata
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM ip_signups WHERE clerk_id = users.clerk_id
)
AND clerk_id IS NOT NULL;

-- 2. Verificar resultados
SELECT 
  COUNT(*) as total_imported,
  COUNT(DISTINCT email) as unique_emails,
  MIN(created_at) as oldest_signup,
  MAX(created_at) as newest_signup
FROM ip_signups
WHERE ip_address = 'historical';

-- 3. Identificar emails duplicados nos dados históricos
SELECT 
  email,
  COUNT(*) as count,
  array_agg(clerk_id) as clerk_ids,
  array_agg(created_at ORDER BY created_at) as signup_dates
FROM ip_signups
WHERE ip_address = 'historical'
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 4. (OPCIONAL) Se encontrou duplicados históricos e quer marcá-los como suspeitos:
/*
UPDATE ip_signups
SET 
  is_blocked = true,
  metadata = metadata || jsonb_build_object(
    'blocked_reason', 'Múltiplas contas detectadas em análise histórica',
    'blocked_at', NOW()
  )
WHERE email IN (
  SELECT email 
  FROM ip_signups 
  WHERE ip_address = 'historical'
  GROUP BY email 
  HAVING COUNT(*) > 1
);
*/

-- ============================================================================
-- ANÁLISE DE DADOS HISTÓRICOS
-- ============================================================================

-- Verificar se há padrões suspeitos por email
WITH email_stats AS (
  SELECT 
    email,
    COUNT(*) as account_count,
    array_agg(DISTINCT plan) as plans_used,
    MIN(created_at) as first_signup,
    MAX(created_at) as last_signup
  FROM users
  GROUP BY email
)
SELECT 
  email,
  account_count,
  plans_used,
  first_signup,
  last_signup,
  EXTRACT(EPOCH FROM (last_signup - first_signup))/86400 as days_between
FROM email_stats
WHERE account_count > 1
ORDER BY account_count DESC, days_between ASC;

-- ============================================================================
-- LIMPEZA (se necessário)
-- ============================================================================

-- Remover importação histórica se quiser recomeçar
-- DELETE FROM ip_signups WHERE ip_address = 'historical';
