-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'superadmin'::text])),
  granted_by uuid,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT admin_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id)
);
CREATE TABLE public.ai_usage (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  operation_type character varying NOT NULL,
  tokens_used integer DEFAULT 0,
  cost numeric DEFAULT 0,
  model_used character varying,
  processing_time_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  usage_type character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT ai_usage_pkey PRIMARY KEY (id),
  CONSTRAINT ai_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id character varying NOT NULL,
  amount integer NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['purchase'::character varying, 'usage'::character varying, 'refund'::character varying, 'bonus'::character varying, 'adjustment'::character varying]::text[])),
  stripe_payment_id character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT credit_transactions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id character varying UNIQUE,
  nome character varying,
  email character varying,
  phone character varying,
  cpf_cnpj character varying,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  stripe_payment_id character varying NOT NULL UNIQUE,
  stripe_subscription_id character varying,
  stripe_invoice_id character varying,
  amount numeric NOT NULL,
  currency character varying DEFAULT 'BRL'::character varying,
  status character varying NOT NULL,
  payment_method character varying DEFAULT 'pix'::character varying,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  customer_id uuid,
  subscription_id uuid,
  stripe_payment_intent_id character varying,
  receipt_url character varying,
  invoice_url character varying,
  plan_type character varying,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id)
);
CREATE TABLE public.plan_changes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id character varying NOT NULL,
  old_plan character varying,
  new_plan character varying,
  changed_at timestamp without time zone DEFAULT now(),
  CONSTRAINT plan_changes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  original_image text NOT NULL,
  stencil_image text NOT NULL,
  style character varying DEFAULT 'standard'::character varying,
  width_cm integer,
  height_cm integer,
  prompt_details text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  thumbnail_url text,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  stripe_subscription_id character varying UNIQUE,
  stripe_price_id character varying,
  stripe_product_id character varying,
  status character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'trialing'::character varying, 'past_due'::character varying, 'canceled'::character varying, 'unpaid'::character varying, 'incomplete'::character varying, 'incomplete_expired'::character varying, 'paused'::character varying]::text[])),
  current_period_start timestamp without time zone,
  current_period_end timestamp without time zone,
  trial_start timestamp without time zone,
  trial_end timestamp without time zone,
  canceled_at timestamp without time zone,
  ended_at timestamp without time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject character varying NOT NULL,
  category character varying DEFAULT 'general'::character varying CHECK (category::text = ANY (ARRAY['billing'::character varying, 'technical'::character varying, 'account'::character varying, 'feature'::character varying, 'general'::character varying]::text[])),
  priority character varying DEFAULT 'normal'::character varying CHECK (priority::text = ANY (ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying]::text[])),
  status character varying DEFAULT 'open'::character varying CHECK (status::text = ANY (ARRAY['open'::character varying, 'in_progress'::character varying, 'waiting_user'::character varying, 'resolved'::character varying, 'closed'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id)
);
CREATE TABLE public.ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_type character varying NOT NULL CHECK (sender_type::text = ANY (ARRAY['user'::character varying, 'admin'::character varying]::text[])),
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  action_taken jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ticket_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id),
  CONSTRAINT ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.usage_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id character varying NOT NULL,
  operation_type character varying NOT NULL CHECK (operation_type::text = ANY (ARRAY['topographic'::character varying, 'lines'::character varying, 'ia_gen'::character varying, 'enhance'::character varying, 'color_match'::character varying]::text[])),
  credits_used integer DEFAULT 0,
  cost_usd numeric,
  metadata jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT usage_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_id character varying NOT NULL UNIQUE,
  email character varying NOT NULL,
  name character varying,
  picture text,
  subscription_status character varying DEFAULT 'inactive'::character varying,
  subscription_id character varying,
  subscription_expires_at timestamp with time zone,
  is_paid boolean DEFAULT false,
  tools_unlocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  credits integer DEFAULT 0 CHECK (credits >= 0),
  plan character varying DEFAULT 'free'::character varying CHECK (plan::text = ANY (ARRAY['free'::character varying, 'starter'::character varying, 'pro'::character varying, 'studio'::character varying]::text[])),
  usage_this_month jsonb DEFAULT '{}'::jsonb,
  daily_usage jsonb DEFAULT '{}'::jsonb,
  grace_period_until timestamp with time zone,
  auto_bill_after_grace boolean DEFAULT false,
  admin_courtesy boolean DEFAULT false,
  admin_courtesy_granted_by uuid,
  admin_courtesy_granted_at timestamp with time zone,
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  blocked_at timestamp with time zone,
  blocked_by uuid,
  is_admin boolean DEFAULT false,
  total_ai_requests integer DEFAULT 0,
  last_active_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_admin_courtesy_granted_by_fkey FOREIGN KEY (admin_courtesy_granted_by) REFERENCES public.users(id)
);
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  source text NOT NULL CHECK (source = ANY (ARRAY['stripe'::text, 'clerk'::text])),
  status text NOT NULL DEFAULT 'processing'::text CHECK (status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])),
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  payload jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT webhook_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event character varying NOT NULL,
  stripe_event_id character varying UNIQUE,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  error text,
  processed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT webhook_logs_pkey PRIMARY KEY (id)
);