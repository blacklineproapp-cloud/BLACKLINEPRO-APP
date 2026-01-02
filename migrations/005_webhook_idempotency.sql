-- =============================================================================
-- MIGRATION: Sistema de Idempotência para Webhooks
-- Data: 2026-01-01
-- Descrição: Previne processamento duplicado de eventos Stripe e Clerk
-- =============================================================================

-- 1. Criar tabela de controle de eventos processados
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificador único do evento (vem do Stripe/Clerk)
  event_id TEXT UNIQUE NOT NULL,

  -- Tipo de evento (checkout.session.completed, user.created, etc)
  event_type TEXT NOT NULL,

  -- Source do webhook (stripe ou clerk)
  source TEXT NOT NULL CHECK (source IN ('stripe', 'clerk')),

  -- Status de processamento
  status TEXT NOT NULL DEFAULT 'processing' CHECK (
    status IN ('processing', 'completed', 'failed')
  ),

  -- Timestamps
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Metadados para debugging
  payload JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Índices de performance
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- 3. Criar índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_status
  ON webhook_events(source, status);

-- 4. Adicionar constraint para garantir unicidade
-- Isso previne race conditions no INSERT
ALTER TABLE webhook_events
  ADD CONSTRAINT unique_event_id UNIQUE (event_id);

-- 5. Criar função de limpeza automática (eventos > 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- 6. Comentários nas tabelas
COMMENT ON TABLE webhook_events IS 'Rastreia eventos de webhooks para garantir idempotência';
COMMENT ON COLUMN webhook_events.event_id IS 'ID único do evento (Stripe event.id ou Clerk evt.id)';
COMMENT ON COLUMN webhook_events.status IS 'Estado: processing (em andamento), completed (sucesso), failed (erro)';
COMMENT ON COLUMN webhook_events.retry_count IS 'Número de tentativas de processamento';

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
