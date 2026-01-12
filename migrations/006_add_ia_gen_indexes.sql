-- ============================================
-- ÍNDICES FALTANTES - StencilFlow
-- Execute no Supabase SQL Editor
-- ============================================

-- Índice otimizado para galeria IA Gen (admin)
-- Usado em: app/api/admin/user-gallery/route.ts
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_operation_created
ON ai_usage(user_id, operation_type, created_at DESC)
WHERE usage_type = 'ai_request';

-- Índice para filtrar apenas registros com image_url
CREATE INDEX IF NOT EXISTS idx_ai_usage_metadata_image
ON ai_usage(user_id, created_at DESC)
WHERE (metadata->>'image_url') IS NOT NULL;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE '✅ Índices para IA Gen Gallery criados';
  RAISE NOTICE '📊 Execute EXPLAIN ANALYZE nas queries para verificar uso';
END $$;
