Atue como:
- CTO de startup unicórnio com experiência em SaaS B2B brasileiro
- Arquiteto de Software Sênior especialista em Next.js 15, Supabase e sistemas escaláveis
- Especialista em segurança de aplicações SaaS (auth, webhooks, RLS, abuse prevention)
- Especialista em SEO técnico e topical authority para nichos específicos
- Especialista em UX/UI e Design orientado a conversão
- Especialista em Branding e posicionamento premium
- Estrategista de crescimento e retenção para SaaS brasileiro

Sua missão é analisar profundamente o projeto BLACK LINE PRO (rebrand do StencilFlow) sob todos os pilares abaixo. Pense como alguém que vai transformar isso no líder absoluto do nicho de ferramentas para tatuadores profissionais no Brasil e LATAM. Se encontrar decisões fracas, seja DIRETO e explique o risco real — sem suavizar.

---

## CONTEXTO DO PROJETO

**Produto:** Black Line Pro (ex-StencilFlow)
SaaS brasileiro para tatuadores profissionais que converte imagens em stencils usando IA.
Features: Editor de stencil (modos topográfico, linhas perfeitas, anime), IA Generativa (Gemini 2.5 Flash), Remove Background, Enhance 4K, Color Match, Split A4, Dashboard de uso.

**Situação do rebrand:**
- Domínio muda de www.stencilflow.com.br → www.blacklinepro.com.br via Cloudflare
- Todas as strings "StencilFlow/stencil" devem virar "Black Line Pro/black" no frontend
- Logos novos já criados — precisam substituir os antigos corretamente
- Cores do frontend já atualizadas para Indigo
- Backend NÃO deve ser alterado
- Frontend: modernizar/estilizar componentes sem quebrar responsividade existente

**Tech Stack:**
- Frontend: Next.js 15.5.9 (App Router), React 18.3.1, TypeScript 5.4.5, TailwindCSS 3.4.3, next-intl 4.8.2 (pt-BR, en), Lucide React, Recharts
- Backend/API: Next.js API Routes, Zod 4.3.5, BullMQ 5.66.2, Sharp 0.34.5, JSZip, jsPDF
- Banco: Supabase (PostgreSQL) + RLS, Redis (IORedis) — cache TTL 5min + rate limiting
- Auth: Clerk + Clerk Webhooks (Svix) — sync Clerk → Supabase
- Pagamentos: Asaas (gateway BR) — PIX, Boleto, Cartão recorrente
- IA: Google Gemini 2.5 Flash
- Email: Resend + React Email
- Monitoramento: Sentry + Custom Logger com PII masking
- Deploy: Vercel (Next.js) + Railway (BullMQ Worker + Redis)
- i18n: next-intl com rotas [locale]

**Estrutura de pastas:**
app/
├── [locale]/
│   ├── page.tsx (landing)
│   ├── pricing/
│   ├── success/
│   ├── (dashboard)/ — rotas autenticadas
│   │   ├── dashboard/, editor/, editor-advanced/, generator/
│   │   ├── tools/, admin/ (24 sub-rotas), admin-checkout/
│   │   ├── assinatura/, faturas/, suporte/, organization/
│   └── (legal)/
└── api/
    ├── webhooks/clerk/ e webhooks/asaas/
    ├── payments/, asaas/, stencil/
    ├── admin/ (39 endpoints), tools/ (5 endpoints)
    ├── projects/, organizations/, queue/, cron/, support/

lib/
├── asaas/ (client, config, types, customer-service, payment-service, subscription-service)
├── billing/ (plans, limits, costs, types)
├── auth.ts, gemini.ts, supabase.ts, cache-redis.ts
├── queue.ts, queue-worker.ts, ratelimit.ts, storage.ts

**Planos de Preço (Assinatura Mensal Recorrente BRL):**
- Free: R$0 — 3 gerações (preview com blur)
- Legacy: R$25 — 100 gerações/mês
- Starter: R$50 — 95 gerações/mês (desconto trimestral/semestral/anual)
- Pro: R$100 — 210 gerações/mês ⭐ (carro-chefe)
- Studio: R$300 — 680 gerações/mês
- Enterprise: R$600 — 1.400 gerações/mês + API Access

**Fluxo de pagamento atual:**
1. Usuário seleciona plano → POST /api/asaas (cria customer + subscription)
2. Asaas cria cobrança → retorna PIX QR / Boleto URL / confirmação cartão
3. Pagamento confirmado → Asaas dispara webhook → POST /api/webhooks/asaas
4. Handler valida token, identifica plano via externalReference ({userId}_{plan}_{cycle})
   → Fallback: busca no banco → parse da description do Asaas
5. activateUserAtomic() → atualiza Supabase (is_paid, plan, subscription_status)
6. Redis invalidado → usuário recebe acesso imediatamente

**Eventos de webhook tratados:**
PAYMENT_RECEIVED/CONFIRMED → ativa usuário
PAYMENT_CREATED → registra cobrança
PAYMENT_OVERDUE → grace period 3 dias
PAYMENT_REFUNDED/DELETED → reverte acesso
PAYMENT_CREDIT_CARD_CAPTURE_REFUSED → marca falha
PAYMENT_CHARGEBACK_* → bloqueia usuário
SUBSCRIPTION_CREATED → registra
SUBSCRIPTION_DELETED/INACTIVATED → cancela, reverte para Free

**Modelo de dados principais:**
- users: clerk_id, email, plan, is_paid, is_blocked, subscription_status, subscription_expires_at, admin_courtesy, usage
- ai_usage: user_id, usage_type, operation_type, cost, created_at
- payments: asaas_payment_id, user_id, plan, status, value
- subscriptions: asaas_subscription_id, user_id, plan, cycle, status
- asaas_customers: asaas_customer_id, user_id, cpf_cnpj
- projects, webhook_events (idempotência), subscription_cancellations

**Custos operacionais (Gemini API):**
- Topographic / Lines / Anime / IA Gen / Enhance 4K: ~$0.039/operação (~R$0,20)
- Color Match / Remove Background: ~$0.020/operação (~R$0,10)
- Split A4: ~$0.010/operação (~R$0,05)

**Segurança já implementada:**
- CSRF protection no middleware
- Admin access via role Clerk (publicMetadata.role) + email whitelist
- Rate limiting via Redis
- Webhook signature validation (Asaas token)
- RLS no Supabase
- Security Headers (HSTS, CSP, X-Frame-Options)
- Custom Logger com PII masking

---

## 1. MIGRAÇÃO DE DOMÍNIO E REBRAND TÉCNICO

Analise e responda:

**DNS e Cloudflare:**
- Protocolo exato de migração DNS para Cloudflare sem downtime
- Registros DNS obrigatórios (A, CNAME, MX, TXT SPF/DKIM/DMARC)
- Configuração SSL/TLS correta (modo Full Strict)
- Cloudflare Workers/Pages como camada de borda: vale a pena agora?
- Redirects 301 de stencilflow.com.br → blacklinepro.com.br preservando SEO

**Rebrand no codebase — mapeamento completo:**
- Todas as strings "stencilflow", "StencilFlow", "stencil" no frontend (messages/, metadata, componentes)
- Variáveis de ambiente com domínio antigo
- Callbacks OAuth (Clerk) que precisam ser atualizados
- Webhook URL registrada no Asaas
- Links canônicos, sitemap, robots.txt
- CORS e allowed origins com domínio antigo
- Resend: verificação do novo domínio para envio

**Logos — substituição correta:**
- Onde cada variante do logo é referenciada (header, footer, emails, manifest.json, metadata)
- Formatos corretos por contexto (SVG inline vs next/image vs PNG estático)
- Tamanhos obrigatórios: favicon (16, 32, 48px), Apple Touch Icon (180px), Android Chrome (192, 512px), OG Image (1200x630), social avatar (400px), header (160x40px)
- Como atualizar sem cache stale (next/image, CDN, browser)
- Checklist completo de go-live

---

## 2. SISTEMA DE PAGAMENTOS — AUDITORIA E AUTOMAÇÃO

**Diagnóstico do fluxo atual:**
- O sistema de ativação está 100% automatizado ou há gaps que exigem intervenção manual?
- O fallback de identificação de plano via parse da description do Asaas é um risco? Como eliminar?
- Race conditions possíveis entre PAYMENT_RECEIVED e PAYMENT_CONFIRMED (PIX/Boleto)?
- A tabela webhook_events garante idempotência perfeita? Qual a estrutura ideal?
- Boleto e PIX com aprovação assíncrona (horas depois): o fluxo cobre isso corretamente?
- PIX expirado sem pagamento: existe cleanup? Usuário pode gerar cobrança duplicada?

**Automação completa — como deve ser:**
- Fluxo ideal de ponta a ponta: seleção de plano → pagamento → ativação → email
- Estrutura ideal das tabelas subscriptions e payments para suportar múltiplos planos/ciclos
- Como garantir reconciliação automática (pagamentos confirmados no Asaas sem ativação no banco)
- Sistema de retry para webhooks falhos
- Monitoramento em tempo real do status de ativação (dashboard admin)

**Tratamento de eventos críticos:**
- Chargeback: o bloqueio é imediato e seguro?
- Cancelamento de assinatura: revogação de acesso é garantida?
- Inadimplência: o grace period de 3 dias está correto para o mercado BR?
- Downgrade de plano: existe lógica para isso?

**Segurança no fluxo:**
- Validação de assinatura do webhook Asaas (token): está implementada corretamente?
- Usuário pode manipular o banco via client-side para "se ativar"? O RLS previne isso?
- Rate limiting nos endpoints de checkout e ativação
- Logs de auditoria de todas as mudanças de plano

---

## 3. SEGURANÇA — AUDITORIA COMPLETA

**Supabase:**
- RLS ativado em todas as tabelas? Quais queries de verificação rodar?
- Políticas por tabela: users, ai_usage, payments, subscriptions, projects, asaas_customers, webhook_events
- SUPABASE_SERVICE_ROLE_KEY: há risco de exposição no frontend? Verificar prefixo NEXT_PUBLIC_
- Supabase Auth vs Clerk: qual é a fonte de verdade de auth? Há inconsistência?
- Storage: buckets públicos vs privados — quem pode acessar imagens geradas?
- Connection Pooling (Pgbouncer) está ativo?

**Next.js / API Routes:**
- Middleware de autenticação cobre TODAS as rotas privadas? Verificar matcher
- Cada API route em /api/tools/ e /api/stencil/ valida auth() server-side antes de processar?
- Variáveis NEXT_PUBLIC_ expostas indevidamente (SUPABASE_SERVICE_ROLE_KEY, ASAAS_API_KEY)?
- Headers de segurança (CSP, HSTS, X-Frame-Options): configuração atual é suficiente?
- Upload de imagens: validação de tipo via magic bytes (não apenas Content-Type), tamanho máximo, scan de conteúdo

**Proteção contra Abuse de IA (risco financeiro crítico):**
- Um usuário não autenticado consegue chamar /api/stencil ou /api/tools?
- Limite de uso por plano é verificado server-side em CADA request?
- Existe limite diário além do mensal para evitar burst abuse?
- Alertas automáticos se custo Gemini ultrapassar threshold?
- Cloudflare WAF rules para proteger rotas de IA de bots e scraping

**Clerk + Middleware:**
- O matcher do middleware cobre /dashboard, /editor, /generator, /tools, /admin?
- Admin routes verificam publicMetadata.role server-side ou apenas client-side?
- JWT expiry e refresh token configurados corretamente?

**Infraestrutura / Cloudflare:**
- WAF rules recomendadas para o nicho
- Rate limiting por IP vs por usuário autenticado
- Bot Fight Mode, Browser Integrity Check
- Hotlink protection para imagens geradas no Supabase Storage
- IPs do Asaas: criar allowlist para o endpoint de webhook

**LGPD:**
- Quais dados pessoais são processados por qual serviço (Clerk, Supabase, Asaas, Resend, Sentry, Google AI)?
- Endpoint de exclusão de conta implementado (Supabase + Clerk + Asaas)?
- Sentry: o beforeSend está mascarando dados pessoais além do Custom Logger?
- Retenção de imagens: política definida e implementada?

---

## 4. FRONTEND — MODERNIZAÇÃO E REBRAND VISUAL

**Regras inegociáveis:**
- Backend intacto
- Responsividade atual preservada
- Apenas estilização e modernização de componentes
- Cores Indigo já aplicadas — não alterar o sistema de cores, apenas refinar
- Logos: substituir antigos pelos novos da forma correta

**Análise do design atual:**
- O design conversa com o nicho tattoo profissional?
- A estética Indigo transmite autoridade técnica no contexto do produto?
- Existe fricção desnecessária nos fluxos principais (upload → geração → download)?
- A hierarquia visual está correta (CTA principal, quota de uso, resultado)?
- O dark mode faz sentido para este nicho? (tatuadores trabalham em ambientes escuros)

**Componentes para modernização (sem quebrar lógica):**
- Cards (dashboard, planos, ferramentas): profundidade, bordas, hover states
- Botões: hierarquia clara (primário Indigo, secundário outline, ghost)
- Inputs e formulários: focus states, error states
- Modal de checkout (AsaasCheckoutModal): fluxo de conversão otimizado?
- Loading states e skeleton screens
- Empty states e error states
- Badges de plano e quota
- Sidebar do dashboard: estado ativo, ícones, hierarquia

**Tipografia:**
- A fonte atual é adequada para o nicho (técnico + artístico)?
- Proposta de par tipográfico: display para headings + body para conteúdo

**Microinterações e animações:**
- Quais microinterações aumentam percepção de qualidade sem impactar performance?
- Animações com propósito (não decorativas): transições de estado, feedback de ação

**Como o design pode:**
- Aumentar conversão Free → Starter/Pro (upsell natural)
- Aumentar retenção (usuário volta todo dia)
- Justificar preço premium vs ferramentas gratuitas
- Criar identidade forte e reconhecível no nicho

---

## 5. PERFORMANCE TÉCNICA E VISUAL

- TTFB atual estimado (Vercel + Cloudflare Edge): está adequado?
- Core Web Vitals: LCP, CLS, FID — principais riscos com a stack atual
- Estratégia de CDN para assets estáticos e imagens geradas
- Edge Functions vs API Routes: o que deve ser movido para edge?
- Lazy loading: o que deve e o que NÃO deve ter lazy load (ex: editor não deve)
- Otimização de imagens: next/image está configurado para todos os casos?
- Bundle size: BullMQ, Sharp, jsPDF — estão sendo importados apenas server-side?
- Re-renderizações: hooks customizados com getOrCreateUser chamam o banco a cada render?
- Estratégia de cache no frontend: SWR/React Query vs fetch nativo?
- Cold start do Vercel: impacto em API routes pesadas? O que mover para Railway?

---

## 6. SEO — MIGRAÇÃO E DOMÍNIO DO NICHO

**Migração sem perda de SEO:**
- Protocolo completo: crawl antes, redirects 301, Search Console Change of Address, sitemap, canonicals
- Timeline realista de recuperação de posições após migração de domínio
- Backlinks existentes: como preservar o link juice?

**Estrutura de URLs ideal:**
- Estrutura atual está otimizada para o nicho?
- Slugs em português ou inglês? (público BR vs global)
- Landing pages por estilo de tatuagem (blackwork, old school, realismo, tribal, aquarela)
- Landing pages por ferramenta (remove background, enhance 4k, gerador IA)

**Topical Authority:**
- Estratégia de blog com clusterização temática para dominar o nicho
- Pillar pages vs cluster content: estrutura ideal
- Palavras-chave transacionais vs informacionais do nicho tattoo BR
- Schema markup: SoftwareApplication, HowTo, FAQPage — onde aplicar?

**SEO técnico com Next.js 15:**
- SSG vs SSR vs ISR: qual para cada tipo de página?
- Edge rendering para SSR: vale configurar?
- Sitemap dinâmico vs estático
- robots.txt: o que deve ser bloqueado (rotas de admin, API)?
- Canonical tags em rotas i18n (pt-BR vs en): configuração correta com next-intl?

---

## 7. BRANDING — BLACK LINE PRO COMO ATIVO ESTRATÉGICO

- O nome "Black Line Pro" é defensável no nicho? Funciona internacionalmente?
- Posicionamento: premium/técnico para profissionais vs acessível para iniciantes — qual escolher?
- Sistema de cores Indigo: transmite o que o nicho espera? É diferenciado da concorrência?
- Tom de voz: técnico, artístico, direto, aspiracional — qual combina com tatuadores profissionais?
- Consistência de marca em todos os touchpoints: app, emails transacionais, social, suporte

**Logos — estrutura completa:**
- Logo horizontal: proporções ideais, onde usar (header, footer, emails, documentos)
- Logo símbolo: favicon, avatar, app icon — requisitos para funcionar em 16x16px
- Versão dark/light: diferenças necessárias
- Versão monocromática: quando usar
- Tamanhos ideais em pixels para cada contexto (website, mobile, PWA, OG, social)

---

## 8. ARQUITETURA E ESCALABILIDADE

**Análise da stack atual (Next.js 15 + Supabase + Clerk + Redis + BullMQ):**
- Pontos fortes: o que foi acertado nas decisões técnicas?
- Gargalos ocultos: o que vai quebrar com crescimento?
- Erros estruturais: decisões que devem ser corrigidas antes de escalar

**Gargalos específicos para investigar:**
- Timeout do Vercel em API routes pesadas (Enhance 4K, Remove Background): está dentro do limite?
- Cold start em serverless: impacto no UX do editor?
- Cache Redis TTL 5min: pode criar inconsistências após mudança de plano?
- N+1 queries nos 39 endpoints admin com 2.500+ usuários
- Connection pool do Supabase: Pgbouncer ativado?

**Estratégia de escala por fase:**
- 100k usuários: o que precisa mudar?
- 1M usuários: o que precisa ser reconstruído?
- Multi-região: quando faz sentido considerar?
- Alta disponibilidade: quais são os single points of failure atuais?

**Arquitetura ideal:**
- Monolito modular (atual) vs microserviços vs híbrido: está correto para o estágio?
- O que deve sair do Next.js para Railway (além do BullMQ worker)?
- Cloudflare R2 para storage de imagens: quando migrar do Supabase Storage?
- Observabilidade: Sentry é suficiente? O que falta (métricas, tracing, alertas)?

---

## 9. MONETIZAÇÃO E MOAT TÉCNICO

- A estrutura de preços atual é defensável? O Pro a R$100 é o plano certo para ser o carro-chefe?
- Como a arquitetura atual pode aumentar LTV?
- Quais features criam lock-in técnico (dados do usuário que não podem ser exportados facilmente)?
- Como usar o histórico de uso (ai_usage) como vantagem competitiva?
- O plano Enterprise com API Access é defensável? Quando priorizar?
- Como criar barreira competitiva difícil de copiar com a base de dados de stencils gerados?
- Estratégia de upsell: os modais de upsell estão no momento certo do fluxo?

---

## 10. ROADMAP PRIORITÁRIO

Organize em 4 fases com justificativa de prioridade:

**FASE 1 — Antes do go-live com novo domínio (esta semana):**
O que é bloqueante para relançar com segurança?

**FASE 2 — Antes de qualquer campanha de marketing:**
O que é risco real se tiver tráfego alto sem estar resolvido?

**FASE 3 — Antes de escalar (1k → 10k usuários):**
O que vai quebrar com crescimento e precisa estar pronto antes?

**FASE 4 — Após tração consolidada:**
O que só faz sentido investir depois de ter produto-mercado claro?

---

## 11. SE VOCÊ FOSSE O CTO

- O que manteria exatamente como está? (decisões certas que não devem ser tocadas)
- O que corrigiria imediatamente? (riscos reais, não teóricos)
- O que reconstruiria antes de escalar? (débito técnico que vai doer)
- Qual a vantagem competitiva mais difícil de copiar que este produto tem?
- O que pode transformar o Black Line Pro no líder absoluto do nicho tattoo SaaS no Brasil e LATAM nos próximos 12 meses?