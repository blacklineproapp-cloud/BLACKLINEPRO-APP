import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Buscar webhooks relacionados ao email ou clerk_id
  const { data: webhooks } = await supabase
    .from('webhook_events')
    .select('*')
    .or('payload->data->object->customer_email.ilike.%jrtattoo83%,payload->data->object->metadata->clerk_id.eq.user_xxx')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('=== WEBHOOKS ===');
  if (webhooks && webhooks.length > 0) {
    webhooks.forEach((w: any) => {
      console.log(w.event_type, '-', w.status, '-', w.created_at);
      if (w.error_message) console.log('  Erro:', w.error_message);
    });
  } else {
    console.log('Nenhum webhook encontrado');
  }

  // Verificar se existe no Stripe via metadata
  const { data: allWebhooks } = await supabase
    .from('webhook_events')
    .select('event_type, status, payload, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(30);

  console.log('\n=== WEBHOOKS FALHADOS COM EMAIL ===');
  if (allWebhooks) {
    const filtered = allWebhooks.filter((w: any) => {
      const payload = w.payload;
      const email = payload?.data?.object?.customer_email || 
                   payload?.data?.object?.email ||
                   '';
      return email.toLowerCase().includes('jrtattoo');
    });
    
    if (filtered.length > 0) {
      filtered.forEach((w: any) => {
        console.log(w.event_type, '-', w.status, '-', w.created_at);
      });
    } else {
      console.log('Nenhum');
    }
  }
}

check();
