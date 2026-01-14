-- 🔒 CORREÇÕES DE SEGURANÇA DO BANCO DE DADOS
-- Este script resolve os erros de "RLS Disabled" e "Security Definer View"

-- ==============================================================================
-- 1. ATIVAR RLS EM TODAS AS TABELAS PÚBLICAS (Bloqueia acesso público por padrão)
-- ==============================================================================

ALTER TABLE public.tattoo_inks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_trial_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remarketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. CORRIGIR VIEWS (Remover SECURITY DEFINER inseguro)
-- ==============================================================================
-- Ao mudar para security_invoker, a view respeita as permissões (RLS) de quem consulta.
-- Isso evita que usuários comuns vejam dados de todos se a view foi criada por um admin.

ALTER VIEW public.v_payment_history SET (security_invoker = true);
ALTER VIEW public.analytics_users_by_plan SET (security_invoker = true);
ALTER VIEW public.analytics_daily_usage SET (security_invoker = true);
ALTER VIEW public.analytics_monthly_revenue SET (security_invoker = true);
ALTER VIEW public.analytics_top_users SET (security_invoker = true);
ALTER VIEW public.v_subscription_status SET (security_invoker = true);
ALTER VIEW public.analytics_usage_summary SET (security_invoker = true);
ALTER VIEW public.analytics_revenue SET (security_invoker = true);
ALTER VIEW public.admin_dashboard_stats_v2 SET (security_invoker = true);

-- ==============================================================================
-- 3. CRIAR POLÍTICAS DE ACESSO (POLICIES)
-- ==============================================================================

-- Função auxiliar para checar se é admin (útil para views e acesso global)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- TATTOO_INKS (Público Leitura, Admin Escrita) ---
CREATE POLICY "Public can view inks" ON public.tattoo_inks FOR SELECT USING (true);
CREATE POLICY "Admins can manage inks" ON public.tattoo_inks FOR ALL USING (public.is_admin());

-- --- CUSTOMERS (Dono lê/edita, Admin vê tudo) ---
CREATE POLICY "User can view own customer data" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can update own customer data" ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all customers" ON public.customers FOR SELECT USING (public.is_admin());

-- --- USAGE_LOGS (Dono lê, Admin vê tudo) ---
-- Nota: user_id aqui é varchar. Convertendo para comparação.
CREATE POLICY "User can view own usage" ON public.usage_logs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can view all usage" ON public.usage_logs FOR SELECT USING (public.is_admin());

-- --- CREDIT_TRANSACTIONS (Dono lê, Admin vê tudo) ---
CREATE POLICY "User can view own credits" ON public.credit_transactions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can view all credits" ON public.credit_transactions FOR SELECT USING (public.is_admin());

-- --- PLAN_CHANGES (Dono lê, Admin vê tudo) ---
CREATE POLICY "User can view own history" ON public.plan_changes FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can view all plan changes" ON public.plan_changes FOR SELECT USING (public.is_admin());

-- --- TABELAS DE SISTEMA/ADMIN (Apenas Admin ou Service Role) ---
-- (admin_logs, webhook_logs, ip_signups, etc)
CREATE POLICY "Admins can view system logs" ON public.admin_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view ip signups" ON public.ip_signups FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view marketing campaigns" ON public.remarketing_campaigns FOR SELECT USING (public.is_admin());

-- --- ORGANIZATIONS (Acesso básico por enquanto) ---
CREATE POLICY "Members can view own organizations" ON public.organizations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = organizations.id AND user_id = auth.uid()
  ) OR owner_id = auth.uid()
);

CREATE POLICY "Admins can view all orgs" ON public.organizations FOR SELECT USING (public.is_admin());

-- --- ORGANIZATION INVITES (Proteger token exposto) ---
-- Apenas o convidado (por email) ou membros da org deveriam ver.
-- Como email não autentica direto, restringimos a membros da org ou admins.
CREATE POLICY "Org members can view invites" ON public.organization_invites FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = organization_invites.organization_id AND user_id = auth.uid()
  )
);
