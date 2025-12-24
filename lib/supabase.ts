import { createClient } from '@supabase/supabase-js';

// Cliente Supabase para uso no servidor (service role)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000) // 30 segundos de timeout (aumentado para instância sobrecarregada)
        });
      }
    }
  }
);

// Cliente Supabase para uso no cliente (anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000) // 30 segundos de timeout (aumentado para instância sobrecarregada)
        });
      }
    }
  }
);

// Tipos do banco de dados
export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  picture?: string;
  subscription_status: 'inactive' | 'active' | 'canceled' | 'past_due' | 'trialing';
  subscription_id?: string;
  subscription_expires_at?: string;
  is_paid: boolean;
  tools_unlocked: boolean;
  created_at: string;
  last_login: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  original_image: string;
  stencil_image: string;
  style: 'standard' | 'perfect_lines';
  width_cm?: number;
  height_cm?: number;
  prompt_details?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  stripe_payment_id: string;
  stripe_subscription_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  payment_method: string;
  description?: string;
  created_at: string;
}

export interface AIUsage {
  id: string;
  user_id: string;
  operation_type: 'generate_stencil' | 'enhance' | 'color_match' | 'generate_idea';
  tokens_used: number;
  cost: number;
  model_used?: string;
  processing_time_ms?: number;
  created_at: string;
}
