-- # Sugestão de Políticas RLS para Produção (StencilFlow)
-- 
-- Estas políticas visam proteger os dados de acessos não autorizados via chave anônima (public),
-- enquanto permitem que o seu backend continue funcionando normalmente via Service Role.

-------------------------------------------------------------------------------
-- ⚡ PASSO 1: Habilitar RLS em todas as tabelas (Se ainda não estiver)
-------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- 🛡️ PASSO 2: Políticas de Segurança "Deep Defense"
-- Nota: O service_role (usado no lib/supabase.ts como supabaseAdmin) 
-- ignora estas políticas automaticamente, garantindo que o app FUNCIONE.
-------------------------------------------------------------------------------

-- 1. Bloquear acesso público direto (Anon Key) a todas as tabelas
-- Isso garante que ninguém consiga ler seus dados via console do navegador
DROP POLICY IF EXISTS "Deny all public access" ON public.users;
CREATE POLICY "Deny all public access" ON public.users FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny all public access" ON public.projects;
CREATE POLICY "Deny all public access" ON public.projects FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny all public access" ON public.payments;
CREATE POLICY "Deny all public access" ON public.payments FOR ALL TO anon USING (false);

-- 2. Permitir que o sistema (service_role) faça qualquer operação
-- (Já é o comportamento padrão do Supabase, mas habilitar RLS sem políticas bloqueia o anon)

-------------------------------------------------------------------------------
-- 💡 Dica: Se no futuro você quiser usar o cliente do Supabase diretamente 
-- no frontend (sem passar pela sua API), você deve trocar o 'false' acima 
-- pela verificação de Auth do Clerk/JWT.
-------------------------------------------------------------------------------
