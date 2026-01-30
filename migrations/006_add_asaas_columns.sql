-- ============================================================================
-- Migration: Adicionar colunas do Asaas
-- Data: Janeiro 2026
-- Descrição: Prepara banco para migração Stripe → Asaas
-- ============================================================================

-- 1. Adicionar colunas na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

-- 2. Adicionar colunas na tabela customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- 3. Adicionar colunas na tabela subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- 4. Adicionar colunas na tabela payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pix_payload TEXT;

-- 5. Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_users_asaas_customer ON users(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_asaas_subscription ON users(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_customers_asaas_customer ON customers(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_subscription ON subscriptions(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_asaas_payment ON payments(asaas_payment_id);

-- 6. Adicionar constraint unique (opcional, pode conflitar se já existir)
-- ALTER TABLE customers ADD CONSTRAINT unique_asaas_customer_id UNIQUE (asaas_customer_id);
-- ALTER TABLE subscriptions ADD CONSTRAINT unique_asaas_subscription_id UNIQUE (asaas_subscription_id);
-- ALTER TABLE payments ADD CONSTRAINT unique_asaas_payment_id UNIQUE (asaas_payment_id);

-- 7. Comentários
COMMENT ON COLUMN users.asaas_customer_id IS 'ID do cliente no Asaas (cus_xxx)';
COMMENT ON COLUMN users.asaas_subscription_id IS 'ID da assinatura ativa no Asaas (sub_xxx)';
COMMENT ON COLUMN customers.asaas_customer_id IS 'ID do cliente no Asaas';
COMMENT ON COLUMN payments.asaas_payment_id IS 'ID do pagamento no Asaas (pay_xxx)';
COMMENT ON COLUMN payments.pix_qr_code IS 'Base64 do QR Code PIX';
COMMENT ON COLUMN payments.pix_payload IS 'Código copia-e-cola do PIX';
