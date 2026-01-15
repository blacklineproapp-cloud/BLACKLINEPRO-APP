-- Create table for storing subscription cancellation reasons
CREATE TABLE public.subscription_cancellations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscription_cancellations_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_cancellations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;

-- Create policy for insertion (authenticated users can insert their own cancellation)
CREATE POLICY "Users can insert their own cancellation feedback" ON public.subscription_cancellations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy for reading (admins only, usually handled by service_role, but explicit deny for users is safer)
CREATE POLICY "Users cannot read cancellations" ON public.subscription_cancellations
  FOR SELECT
  TO authenticated
  USING (false);
