-- ===========================================
-- MIGRAÇÃO: Atualizar constraint para novos planos
-- Execute este SQL no Supabase SQL Editor
-- ===========================================

-- 1. Remover a constraint antiga
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_plan_valid;

-- 2. Adicionar nova constraint com os planos corretos
ALTER TABLE public.users ADD CONSTRAINT check_plan_valid 
    CHECK (plan IN ('free', 'starter', 'pro', 'studio'));

-- 3. Verificar se funcionou
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'check_plan_valid';

-- 4. Opcional: Migrar usuários existentes com planos antigos
-- UPDATE public.users SET plan = 'starter' WHERE plan = 'editor_only';
-- UPDATE public.users SET plan = 'pro' WHERE plan = 'full_access';
