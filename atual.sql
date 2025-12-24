-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_usage (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  operation_type character varying NOT NULL,
  tokens_used integer DEFAULT 0,
  cost numeric DEFAULT 0,
  model_used character varying,
  processing_time_ms integer,
  created_at timestamp with time zone DEFAULT now(),
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
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
  plan character varying DEFAULT 'free'::character varying CHECK (plan::text = ANY (ARRAY['free'::character varying, 'pro'::character varying, 'studio'::character varying]::text[])),
  usage_this_month jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);