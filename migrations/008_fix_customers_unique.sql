-- ============================================================================
-- Migration: Adicionar UNIQUE constraint em customers.user_id
-- Descrição: Permite upsert correto no AsaasCustomerService.findOrCreate
-- ============================================================================

-- PASSO 1: Identificar e manter apenas o customer mais recente por user_id
-- Criar tabela temporária com os IDs que devem ser mantidos
CREATE TEMP TABLE customers_to_keep AS
SELECT DISTINCT ON (user_id) id, user_id
FROM customers
ORDER BY user_id, created_at DESC;

-- PASSO 2: Atualizar referências em payments para apontar para o customer correto
UPDATE payments p
SET customer_id = ctk.id
FROM customers c
JOIN customers_to_keep ctk ON c.user_id = ctk.user_id
WHERE p.customer_id = c.id
  AND c.id != ctk.id;

-- PASSO 3: Atualizar referências em subscriptions para apontar para o customer correto
UPDATE subscriptions s
SET customer_id = ctk.id
FROM customers c
JOIN customers_to_keep ctk ON c.user_id = ctk.user_id
WHERE s.customer_id = c.id
  AND c.id != ctk.id;

-- PASSO 4: Deletar customers duplicados (agora sem foreign key violations)
DELETE FROM customers
WHERE id NOT IN (SELECT id FROM customers_to_keep);

-- PASSO 5: Adicionar constraint UNIQUE
ALTER TABLE customers 
ADD CONSTRAINT customers_user_id_unique UNIQUE (user_id);

-- PASSO 6: Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- Verificação
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) - COUNT(DISTINCT user_id) INTO duplicate_count
  FROM customers;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE '✅ Migration 008 executada com sucesso!';
    RAISE NOTICE '   - Duplicatas removidas: %', (SELECT COUNT(*) FROM customers) - (SELECT COUNT(*) FROM customers_to_keep);
    RAISE NOTICE '   - Constraint UNIQUE adicionada em customers.user_id';
  ELSE
    RAISE EXCEPTION 'Ainda existem % duplicatas!', duplicate_count;
  END IF;
END $$;
