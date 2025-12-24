-- Migration 002: Normalização do Sistema de Billing
-- Data: 2025-12-19
-- Objetivo: Separar dados de billing em tabelas dedicadas para melhor organização e rastreabilidade

-- ============================================================================
-- 1. CRIAR TABELA CUSTOMERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  nome VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  cpf_cnpj VARCHAR(14),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_id ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at_trigger
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

-- ============================================================================
-- 2. CRIAR TABELA SUBSCRIPTIONS (Normalizada)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  stripe_product_id VARCHAR(255),
  status VARCHAR(50) CHECK (status IN (
    'active', 'trialing', 'past_due', 'canceled',
    'unpaid', 'incomplete', 'incomplete_expired', 'paused'
  )),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  canceled_at TIMESTAMP,
  ended_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at_trigger
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================================================
-- 3. CRIAR TABELA WEBHOOK_LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event VARCHAR(255) NOT NULL,
  stripe_event_id VARCHAR(255) UNIQUE,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_stripe_event_id ON webhook_logs(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- ============================================================================
-- 4. ATUALIZAR TABELA PAYMENTS
-- ============================================================================

-- Adicionar novas colunas à tabela payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS invoice_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'card';

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id ON payments(stripe_invoice_id);

-- ============================================================================
-- 5. MIGRAR DADOS EXISTENTES
-- ============================================================================

-- Criar customers a partir de users existentes que têm subscription
INSERT INTO customers (user_id, email, stripe_customer_id, nome)
SELECT
  id,
  email,
  subscription_id,  -- Temporariamente usando subscription_id como customer_id
  COALESCE(name, email) as nome
FROM users
WHERE subscription_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM customers WHERE customers.user_id = users.id)
ON CONFLICT DO NOTHING;

-- Criar subscriptions a partir de dados em users
INSERT INTO subscriptions (
  customer_id,
  stripe_subscription_id,
  status,
  current_period_end
)
SELECT
  c.id as customer_id,
  u.subscription_id,
  u.subscription_status,
  u.subscription_expires_at
FROM users u
INNER JOIN customers c ON c.user_id = u.id
WHERE u.subscription_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.stripe_subscription_id = u.subscription_id
  )
ON CONFLICT DO NOTHING;

-- Vincular pagamentos existentes com customers
UPDATE payments p
SET customer_id = c.id
FROM customers c
WHERE p.user_id = c.user_id
  AND p.customer_id IS NULL;

-- Vincular pagamentos com subscriptions quando possível
UPDATE payments p
SET subscription_id = s.id
FROM subscriptions s
INNER JOIN customers c ON c.id = s.customer_id
WHERE p.customer_id = c.id
  AND p.subscription_id IS NULL
  AND p.stripe_subscription_id = s.stripe_subscription_id;

-- ============================================================================
-- 6. CRIAR VIEWS ÚTEIS
-- ============================================================================

-- View para ver status completo de assinatura
CREATE OR REPLACE VIEW v_subscription_status AS
SELECT
  u.id as user_id,
  u.email,
  u.clerk_id,
  u.plan,
  u.is_paid,
  u.tools_unlocked,
  c.id as customer_id,
  c.stripe_customer_id,
  s.id as subscription_id,
  s.stripe_subscription_id,
  s.status as subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.trial_start,
  s.trial_end,
  s.canceled_at,
  CASE
    WHEN s.status = 'active' THEN true
    WHEN s.status = 'trialing' THEN true
    ELSE false
  END as has_active_subscription
FROM users u
LEFT JOIN customers c ON c.user_id = u.id
LEFT JOIN subscriptions s ON s.customer_id = c.id AND s.status IN ('active', 'trialing');

-- View para histórico de pagamentos
CREATE OR REPLACE VIEW v_payment_history AS
SELECT
  p.id,
  p.created_at,
  u.email,
  u.clerk_id,
  p.amount,
  p.currency,
  p.status,
  p.payment_method,
  p.description,
  p.plan_type,
  p.receipt_url,
  p.invoice_url,
  s.stripe_subscription_id,
  s.status as subscription_status
FROM payments p
LEFT JOIN customers c ON c.id = p.customer_id
LEFT JOIN users u ON u.id = c.user_id
LEFT JOIN subscriptions s ON s.id = p.subscription_id
ORDER BY p.created_at DESC;

-- ============================================================================
-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE customers IS 'Armazena informações de clientes do Stripe vinculados a usuários';
COMMENT ON TABLE subscriptions IS 'Gerencia assinaturas do Stripe com todos os detalhes de período e status';
COMMENT ON TABLE webhook_logs IS 'Log de todos os webhooks recebidos do Stripe para debug e rastreabilidade';

COMMENT ON COLUMN customers.stripe_customer_id IS 'ID do customer no Stripe (formato: cus_xxx)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'ID da subscription no Stripe (formato: sub_xxx)';
COMMENT ON COLUMN subscriptions.stripe_price_id IS 'ID do price no Stripe (formato: price_xxx)';
COMMENT ON COLUMN subscriptions.metadata IS 'Dados extras em JSON para informações adicionais';
COMMENT ON COLUMN webhook_logs.stripe_event_id IS 'ID único do evento no Stripe para evitar duplicação';
COMMENT ON COLUMN webhook_logs.processed IS 'Indica se o webhook foi processado com sucesso';

-- ============================================================================
-- 8. PERMISSÕES (se usando RLS)
-- ============================================================================

-- Permitir que serviço role acesse tudo
GRANT ALL ON customers TO service_role;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON webhook_logs TO service_role;

-- Permitir leitura para usuários autenticados (através da aplicação)
-- RLS será configurado conforme necessário

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 002 concluída com sucesso!';
  RAISE NOTICE '📊 Tabelas criadas: customers, subscriptions, webhook_logs';
  RAISE NOTICE '📊 Tabela atualizada: payments';
  RAISE NOTICE '📊 Views criadas: v_subscription_status, v_payment_history';
  RAISE NOTICE '✨ Sistema de billing normalizado e pronto para uso!';
END $$;
