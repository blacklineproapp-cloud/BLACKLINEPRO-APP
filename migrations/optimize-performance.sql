-- ============================================
-- OTIMIZAÇÕES DE PERFORMANCE - StencilFlow
-- Reduzir carga no Supabase Nano
-- ============================================
-- 
-- INSTRUÇÕES:
-- Execute este script no Supabase Dashboard → SQL Editor
-- Não precisa dividir em partes, pode executar tudo de uma vez
-- ============================================

-- ============================================
-- 1. ÍNDICES COMPOSTOS OTIMIZADOS
-- ============================================

-- Dashboard: buscar projetos por usuário ordenados por data
-- Usado em: app/(dashboard)/dashboard/page.tsx
CREATE INDEX IF NOT EXISTS idx_projects_user_created 
ON projects(user_id, created_at DESC);

-- Admin: contagem de usuários ativos pagantes
-- Usado em: app/api/admin/stats/route.ts
CREATE INDEX IF NOT EXISTS idx_users_status_paid 
ON users(subscription_status, is_paid) 
WHERE is_paid = true;

-- AI Usage: queries por data (para estatísticas diárias)
-- Usado em: app/api/admin/stats/route.ts
CREATE INDEX IF NOT EXISTS idx_ai_usage_created 
ON ai_usage(created_at DESC);

-- Payments: soma de valores bem-sucedidos
-- Usado em: app/api/admin/stats/route.ts
CREATE INDEX IF NOT EXISTS idx_payments_status_amount
ON payments(status, amount)
WHERE status = 'succeeded';

-- Users: busca recente por data de criação
-- Usado em: app/api/admin/stats/route.ts
CREATE INDEX IF NOT EXISTS idx_users_created
ON users(created_at DESC);

-- ============================================
-- 2. VIEW OTIMIZADA PARA ADMIN STATS
-- ============================================

-- Esta VIEW substitui 8 queries separadas por 1 única
-- Reduz drasticamente a carga no banco
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  -- Total de usuários
  (SELECT COUNT(*) FROM users) as total_users,
  
  -- Usuários ativos (pagantes com subscription ativa)
  (SELECT COUNT(*) FROM users 
   WHERE subscription_status = 'active' AND is_paid = true) as active_users,
  
  -- Total de projetos criados
  (SELECT COUNT(*) FROM projects) as total_projects,
  
  -- Receita total (soma de pagamentos bem-sucedidos)
  (SELECT COALESCE(SUM(amount), 0) FROM payments 
   WHERE status = 'succeeded') as total_revenue,
  
  -- Uso de IA hoje
  (SELECT COUNT(*) FROM ai_usage 
   WHERE created_at >= CURRENT_DATE) as ai_usage_today,
  
  -- Custo total de IA
  (SELECT COALESCE(SUM(cost), 0) FROM ai_usage) as total_ai_cost,
  
  -- Novos usuários nos últimos 7 dias
  (SELECT COUNT(*) FROM users 
   WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_week;

-- Comentário da view
COMMENT ON VIEW admin_dashboard_stats IS 
'View otimizada que agrega estatísticas admin em uma única query. Reduz 8 queries para 1.';

-- ============================================
-- 3. ANÁLISE DE PERFORMANCE
-- ============================================

-- Para verificar se os índices estão sendo usados:
-- EXPLAIN ANALYZE SELECT * FROM projects WHERE user_id = 'xxx' ORDER BY created_at DESC;
-- EXPLAIN ANALYZE SELECT * FROM admin_dashboard_stats;

-- ============================================
-- 4. VERIFICAÇÃO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Índices otimizados criados';
  RAISE NOTICE '✅ VIEW admin_dashboard_stats criada';
  RAISE NOTICE '📊 Execute: SELECT * FROM admin_dashboard_stats para testar';
END $$;
