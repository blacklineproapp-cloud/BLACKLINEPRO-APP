-- ============================================================================
-- Migration: Adicionar UNIQUE constraint em payments.asaas_payment_id
-- Descrição: Permite upsert correto no AsaasPaymentService.saveToDatabase
-- ============================================================================

-- Verificar se já existe a constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_asaas_payment_id_unique'
  ) THEN
    -- Adicionar constraint UNIQUE
    ALTER TABLE payments 
    ADD CONSTRAINT payments_asaas_payment_id_unique UNIQUE (asaas_payment_id);
    
    RAISE NOTICE '✅ Constraint UNIQUE adicionada em payments.asaas_payment_id';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint já existe';
  END IF;
END $$;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_payments_asaas_payment_id ON payments(asaas_payment_id);

-- Verificação
SELECT 'Migration 009 executada com sucesso!' as status;
