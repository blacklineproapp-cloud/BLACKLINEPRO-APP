
-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (clean slate)
-- ============================================
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================
-- RLS POLICIES: SERVICE ROLE BYPASSES RLS AUTOMATICALLY
-- All app access goes through supabaseAdmin (service_role)
-- These policies protect against direct anon/authenticated access
-- ============================================

-- USERS: users can only read their own row
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (
  clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- PROJECTS: users can only access their own projects
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (
  user_id IN (SELECT id FROM public.users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (
  user_id IN (SELECT id FROM public.users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
);

-- AI_USAGE: users can only see their own usage
CREATE POLICY "ai_usage_select_own" ON public.ai_usage FOR SELECT USING (
  user_id IN (SELECT id FROM public.users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
);

-- SUPPORT_TICKETS: users can only see their own tickets
CREATE POLICY "tickets_select_own" ON public.support_tickets FOR SELECT USING (
  user_id IN (SELECT id FROM public.users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
);
CREATE POLICY "tickets_insert_own" ON public.support_tickets FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
);

-- TICKET_MESSAGES: users can only see messages from their tickets
CREATE POLICY "messages_select_own" ON public.ticket_messages FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE user_id IN (
      SELECT id FROM public.users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- WEBHOOK_EVENTS, PAYMENTS, SUBSCRIPTIONS, ADMIN_*: no direct access (service_role only)
-- RLS enabled + no policies = blocked for anon/authenticated, service_role bypasses

-- ORGANIZATIONS: members can see their org
CREATE POLICY "org_select_member" ON public.organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM public.organization_members WHERE user_id IN (
    SELECT id FROM public.users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  ))
);

CREATE POLICY "org_members_select" ON public.organization_members FOR SELECT USING (
  user_id IN (SELECT id FROM public.users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
);
