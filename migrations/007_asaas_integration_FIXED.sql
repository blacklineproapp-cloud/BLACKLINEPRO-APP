-- ============================================================================
-- Migration: Integração Asaas (CORRIGIDA)
-- Data: Janeiro 2026
-- Descrição: Adiciona suporte ao Asaas nas tabelas EXISTENTES
-- ============================================================================

-- ============================================================================
-- PARTE 1: Adicionar colunas na tabela USERS
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_asaas_customer ON users(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_asaas_subscription ON users(asaas_subscription_id);

-- ============================================================================
-- PARTE 2: Adicionar colunas na tabela CUSTOMERS (já existe)
-- ============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_asaas ON customers(asaas_customer_id);

-- ============================================================================
-- PARTE 3: Adicionar colunas na tabela SUBSCRIPTIONS (já existe)
-- ============================================================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_type TEXT; -- BOLETO, CREDIT_CARD, PIX
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cycle TEXT DEFAULT 'MONTHLY';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_due_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_day INTEGER;

CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas ON subscriptions(asaas_subscription_id);

-- ============================================================================
-- PARTE 4: Adicionar colunas na tabela PAYMENTS (já existe)
-- ============================================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pix_payload TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pix_expiration_date TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_slip_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_payments_asaas ON payments(asaas_payment_id);

-- ============================================================================
-- PARTE 5: Atualizar tabela WEBHOOK_EVENTS (já existe)
-- Adicionar 'asaas' como source válido
-- ============================================================================

-- Remover constraint antiga e criar nova com 'asaas'
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_source_check;
ALTER TABLE webhook_events ADD CONSTRAINT webhook_events_source_check
  CHECK (source = ANY (ARRAY['stripe'::text, 'clerk'::text, 'asaas'::text]));

-- Adicionar coluna provider se não existir (alguns schemas usam 'provider' em vez de 'source')
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS provider TEXT;

-- ============================================================================
-- PARTE 6: Criar tabela MIGRATION_QUEUE (nova)
-- ============================================================================

CREATE TABLE IF NOT EXISTS migration_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  migration_type TEXT NOT NULL, -- 'pagante', 'cortesia_pagou', 'cortesia_nunca_pagou'
  stripe_customer_id TEXT,
  stripe_first_payment_date DATE,
  stripe_last_payment_date DATE,
  stripe_total_payments INTEGER DEFAULT 0,
  is_courtesy BOOLEAN DEFAULT FALSE,
  courtesy_granted_at TIMESTAMPTZ,
  current_plan TEXT NOT NULL DEFAULT 'starter',
  billing_day INTEGER NOT NULL,
  next_due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, migrated, skipped, failed
  migrated_at TIMESTAMPTZ,
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_migration_queue_status ON migration_queue(status);
CREATE INDEX IF NOT EXISTS idx_migration_queue_next_due ON migration_queue(next_due_date);

-- ============================================================================
-- PARTE 7: Criar tabela ASAAS_CUSTOMERS (cache local - opcional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS asaas_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  asaas_customer_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  cpf_cnpj TEXT,
  phone TEXT,
  mobile_phone TEXT,
  external_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asaas_cust_user ON asaas_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_asaas_cust_email ON asaas_customers(email);

-- ============================================================================
-- PARTE 8: Trigger para updated_at
-- ============================================================================

-- Função já pode existir, criar se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para migration_queue
DROP TRIGGER IF EXISTS update_migration_queue_updated_at ON migration_queue;
CREATE TRIGGER update_migration_queue_updated_at
  BEFORE UPDATE ON migration_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para asaas_customers
DROP TRIGGER IF EXISTS update_asaas_customers_updated_at ON asaas_customers;
CREATE TRIGGER update_asaas_customers_updated_at
  BEFORE UPDATE ON asaas_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTE 9: Desabilitar RLS nas novas tabelas
-- ============================================================================

ALTER TABLE migration_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_customers DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 007_asaas_integration_FIXED executada!';
  RAISE NOTICE '   - Colunas asaas_* adicionadas em users, customers, subscriptions, payments';
  RAISE NOTICE '   - webhook_events atualizada para aceitar source=asaas';
  RAISE NOTICE '   - Tabela migration_queue criada';
  RAISE NOTICE '   - Tabela asaas_customers criada';
END $$;
