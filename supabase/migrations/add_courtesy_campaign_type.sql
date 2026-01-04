-- Adicionar 'courtesy' aos tipos aceitos de campaign_type em remarketing_campaigns
-- Data: 2026-01-04

-- 1. Remover constraint antiga
ALTER TABLE public.remarketing_campaigns
DROP CONSTRAINT IF EXISTS remarketing_campaigns_campaign_type_check;

-- 2. Adicionar nova constraint incluindo 'courtesy'
ALTER TABLE public.remarketing_campaigns
ADD CONSTRAINT remarketing_campaigns_campaign_type_check
CHECK (campaign_type::text = ANY (ARRAY[
  'initial'::character varying,
  'reminder'::character varying,
  'final'::character varying,
  'courtesy'::character varying
]::text[]));

-- Comentário
COMMENT ON CONSTRAINT remarketing_campaigns_campaign_type_check ON public.remarketing_campaigns IS
'Tipos de campanha: initial (primeira), reminder (lembrete), final (última chance), courtesy (link de pagamento para usuários migrados)';
