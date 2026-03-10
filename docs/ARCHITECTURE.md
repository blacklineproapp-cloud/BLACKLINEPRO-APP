# Arquitetura BlacklinePRO

> Documentacao tecnica completa para desenvolvedores.
> Ultima atualizacao: Marco 2026

---

## 1. Visao Geral

**BlacklinePRO** e um SaaS para tatuadores que transforma imagens em stencils profissionais usando IA (Google Gemini). A plataforma oferece:

- **Editor de Stencil** -- converte fotos em stencils topograficos ou de linhas perfeitas
- **Gerador de Ideias** -- cria arte de tatuagem a partir de prompts textuais
- **Ferramentas** -- remocao de fundo, aprimoramento 4K, combinacao de cores de tinta, divisao A4
- **Desenho a mao** -- canvas de desenho vetorial integrado
- **Organizacoes** -- multi-usuario para estudios (plano Studio)

### Stack Tecnologico

| Camada        | Tecnologia                                      |
|---------------|--------------------------------------------------|
| Frontend      | Next.js 15.5, React 18, Tailwind CSS 3           |
| Linguagem     | TypeScript 5.4                                    |
| Auth          | Clerk (SSO, webhook sync)                         |
| Banco de Dados| Supabase (PostgreSQL + RLS)                       |
| IA            | Google Gemini 2.5 Flash Image                     |
| Fila          | BullMQ + Redis (Railway)                          |
| Cache         | Redis (Railway) + fallback em memoria             |
| Storage       | Cloudflare R2 (primario) + Supabase Storage (legado) |
| Pagamentos    | Asaas (PIX, boleto, cartao -- Brasil)             |
| Email         | Resend + React Email                              |
| Monitoring    | Sentry (errors + source maps)                     |
| Deploy        | Railway (app + worker) + Vercel (preview)         |
| i18n          | next-intl (6 idiomas)                             |
| PWA           | Service Worker + manifest.json                    |

---

## 2. Estrutura de Diretorios

```
blacklinepro/
├── app/
│   ├── [locale]/              # Rotas com i18n (next-intl)
│   │   ├── (dashboard)/       # Rotas protegidas (editor, tools, admin...)
│   │   ├── (legal)/           # Paginas legais (termos, privacidade...)
│   │   ├── page.tsx           # Landing page
│   │   └── pricing/           # Pagina de precos
│   ├── api/                   # 77 API routes (Route Handlers)
│   │   ├── stencil/           # Geracao de stencils e ideias
│   │   ├── tools/             # Ferramentas (remove-bg, enhance, color-match, split-a4)
│   │   ├── admin/             # ~40 rotas administrativas
│   │   ├── asaas/             # Pagamentos (cancel, invoices, subscription)
│   │   ├── webhooks/          # Webhooks Clerk e Asaas
│   │   ├── organizations/     # CRUD organizacoes
│   │   ├── r2/                # Upload/download Cloudflare R2
│   │   ├── projects/          # CRUD projetos do usuario
│   │   ├── support/           # Tickets de suporte
│   │   └── user/              # Dados do usuario (me, status)
│   └── layout.tsx             # Root layout
├── components/                # 59 componentes React
│   ├── asaas/                 # Formularios de pagamento (PIX, boleto, cartao)
│   ├── drawing/               # Canvas de desenho vetorial
│   ├── editor/                # Controles do editor de stencil
│   ├── landing/               # Componentes da landing page
│   ├── organization/          # Gestao de organizacoes
│   ├── split-a4/              # Divisao de stencil em folhas A4
│   ├── tools/                 # Resultados das ferramentas
│   ├── ui/                    # Componentes base (button, card, badge, modal)
│   └── upsell/                # Modais de upgrade e comparacao de planos
├── lib/                       # Logica de negocio (backend)
│   ├── gemini/                # Modulos de IA (8 arquivos)
│   ├── billing/               # Planos, limites, custos, servico
│   ├── asaas/                 # Integracao gateway de pagamento
│   ├── organizations/         # Logica multi-usuario
│   ├── migration/             # Migracao Stripe -> Asaas
│   ├── email/                 # Templates de email
│   ├── drawing/               # Tipos e utils do canvas
│   ├── constants/             # Limites, timeouts, body-areas
│   └── types/                 # Tipos TypeScript compartilhados
├── emails/                    # Templates React Email (remarketing, cortesia)
├── hooks/                     # React hooks (PWA, drawing history, editor history)
├── i18n/                      # Configuracao next-intl
├── messages/                  # Traducoes (pt, en, es, fr, it, ja)
├── migrations/                # SQL migrations do Supabase
├── scripts/                   # Scripts de manutencao e operacoes
├── public/                    # Assets estaticos + PWA
└── supabase/                  # Migrations adicionais do Supabase
```

---

## 3. Fluxo de Dados

### Fluxo de uma requisicao tipica

```
Browser
  │
  ▼
middleware.ts
  ├── next-intl (detecta locale, redireciona)
  ├── CSRF (valida Origin/Referer em POST/PUT/DELETE/PATCH)
  ├── Admin check (Clerk metadata + email whitelist)
  └── auth.protect() (rotas privadas)
  │
  ▼
API Route Handler (app/api/**/route.ts)
  │
  ├── withAuth()          ← autentica usuario, busca/cria no Supabase
  ├── withAdminAuth()     ← autentica + verifica role admin
  └── withSuperAdminAuth()← autentica + verifica superadmin
  │
  ▼
Logica de negocio (lib/)
  ├── checkToolAccess()   ← billing: admin bypass → plano → limite → trial
  ├── rateLimit()         ← Redis sliding window
  ├── Gemini API          ← geracao de imagens/stencils
  └── Supabase            ← CRUD no PostgreSQL
  │
  ▼
Resposta JSON / Imagem
```

### Fluxo de geracao de stencil (com fila)

```
1. POST /api/stencil/generate
   └── withAuth → checkToolAccess → enqueue job

2. BullMQ Queue ("stencil-generation")
   └── Redis armazena job

3. Worker (scripts/railway-worker.ts)
   └── stencilWorker processa:
       ├── Gemini 2.5 Flash Image → gera stencil
       ├── Upload para R2 (ou Supabase Storage)
       ├── Salva projeto no Supabase
       └── recordUsage (registra custo)

4. GET /api/queue/status/[jobId]
   └── Polling do frontend para status do job
```

---

## 4. Modulos Principais

### 4.1 Autenticacao (Clerk + Supabase)

**Arquivos:** `lib/auth.ts`, `lib/api-middleware.ts`, `lib/admin-config.ts`, `middleware.ts`

- **Clerk** gerencia login/registro (SSO, OAuth, email)
- **Supabase** armazena dados do usuario (plano, creditos, uso)
- `getOrCreateUser(clerkId)` -- busca usuario no Supabase; se nao existe, cria com dados do Clerk
- Resultado e cacheado em Redis (via `getOrSetCache`) para evitar query repetida
- `updateUserActivity()` -- throttled a cada 15 minutos para nao sobrecarregar o banco

**Niveis de acesso:**
- `withAuth` -- qualquer usuario autenticado
- `withAdminAuth` -- admin (verificado por `role` no Clerk metadata OU email na whitelist `ADMIN_EMAILS`)
- `withSuperAdminAuth` -- superadmin (role especifica)

**Webhook Clerk** (`app/api/webhooks/clerk/route.ts`):
- Sincroniza criacao/atualizacao de usuarios Clerk -> Supabase
- Validado com Svix (assinatura)

### 4.2 Billing (Planos, Limites e Custos)

**Arquivos:** `lib/billing/` (plans.ts, limits.ts, costs.ts, types.ts, service.ts, index.ts)

**Planos disponiveis:**

| Plano   | Preco/mes | Geracoes/mes | Ferramentas | IA Avancada |
|---------|-----------|--------------|-------------|-------------|
| Free    | R$ 0      | 3 (com blur) | Bloqueado   | Bloqueado   |
| Ink     | R$ 29     | 95           | 95          | Bloqueado   |
| Pro     | R$ 69     | 350          | 350         | 350         |
| Studio  | R$ 199    | 680          | 680         | 680         |

**Ciclos:** Mensal, Trimestral, Semestral, Anual

**`checkToolAccess()`** -- padrao centralizado usado em todas as rotas de ferramentas:

```
1. Admin? → bypass total (sem limites)
2. Assinante ativo com tools_unlocked? → verificar limite do plano
3. Free user? → verificar limite trial especifico
4. Retorna { denied, response, recordUsage() }
```

**Custos por operacao** (registrados em `ai_usage`):
- Stencil topografico/linhas: ~USD 0.039
- Geracao por IA: ~USD 0.039
- Ferramentas (enhance, remove-bg, color-match): ~USD 0.010-0.039

### 4.3 IA / Gemini

**Arquivos:** `lib/gemini/` (8 modulos)

```
lib/gemini/
├── index.ts               # Barrel file (re-exports)
├── models-config.ts       # Configuracao de modelos e safety settings
├── stencil-generation.ts  # generateStencilFromImage, generateStencilWithCost
├── image-generation.ts    # generateTattooIdea (texto → imagem)
├── image-enhancement.ts   # enhanceImage, removeBackground
├── image-analysis.ts      # analyzeImageColors (color matching)
├── image-preprocessing.ts # Pre-processamento de imagens
├── pipelines.ts           # generateLinesFromTopographic (pipeline multi-step)
└── __tests__/             # Testes unitarios
```

**Modelo principal:** `gemini-2.5-flash-image`
- Temperature 0.4 para stencils topograficos (balanco entre fidelidade e criatividade)
- Safety settings relaxados (arte pode ser mal interpretada por filtros padrao)

**Operacoes de IA:**
- `topographic` -- converte foto em stencil estilo topografico
- `lines` -- converte foto em stencil de linhas perfeitas
- `ia_gen` -- gera arte de tatuagem a partir de prompt
- `enhance` -- aprimora imagem para 4K
- `remove_bg` -- remove fundo da imagem
- `color_match` -- analisa cores e sugere tintas de tatuagem

### 4.4 Cache (Redis + Memoria)

**Arquivos:** `lib/cache-redis.ts`, `lib/cache.ts`

- **Redis (Railway)** -- cache primario em producao, compartilhado entre instancias
- **Fallback em memoria** -- usado quando Redis nao esta disponivel (desenvolvimento)
- Migrado de Upstash (US$ 12/mes) para Railway Redis (gratuito, mesmo datacenter)
- Timeout de 10s para comandos Redis (fallback automatico para memoria se exceder)
- Funcao principal: `getOrSetCache(key, fetchFn, ttlSeconds)`

### 4.5 Fila (BullMQ + Workers)

**Arquivos:** `lib/queue.ts`, `lib/queue-worker.ts`, `scripts/railway-worker.ts`

**Tipos de job:**

| Fila                  | Dados                                      | Processamento                    |
|-----------------------|--------------------------------------------|----------------------------------|
| `stencil-generation`  | userId, image (base64), style, operationType | Gemini → R2 upload → Supabase  |
| `enhance`             | userId, image                              | Gemini enhance → resultado       |
| `ia-generation`       | userId, prompt, size (1K/2K/4K)            | Gemini → imagem gerada           |
| `color-match`         | userId, image                              | Gemini → analise de cores        |

- Workers rodam em processo separado no Railway (`npm run worker`)
- Graceful shutdown com SIGTERM handling
- Conexao Redis com reconnect seletivo
- Polling de status via `GET /api/queue/status/[jobId]`

### 4.6 Storage (R2 + Supabase)

**Arquivos:** `lib/r2.ts` (Cloudflare R2), `lib/storage.ts` (Supabase Storage)

**Cloudflare R2 (primario):**
- Bucket: `blacklinepro-images`
- Estrutura: `users/{clerkUserId}/{projectId}/{type}.png` (pagos) ou `anon/{anonId}/{projectId}/{type}.png` (gratuitos)
- URLs presigned com expiracao de 1 hora
- API via AWS S3 SDK (`@aws-sdk/client-s3`)
- Rotas: `app/api/r2/` (upload, presign, delete, files)

**Supabase Storage (legado):**
- Bucket: `project-images`
- Usado para imagens legadas (pre-migracao R2)
- Thumbnails gerados com `sharp` (300x300px)

### 4.7 Organizacoes

**Arquivos:** `lib/organizations/` (index.ts, invites.ts, members.ts), `lib/types/organization.ts`

- Disponivel nos planos Studio e Enterprise
- Permite convidar membros para compartilhar creditos/geracao
- Convites por token com expiracao
- Roles: owner, admin, member
- API: `app/api/organizations/` (CRUD, invite, members)

---

## 5. API Routes (77 rotas)

### Stencil / Geracao

| Rota                              | Metodo | Descricao                          |
|-----------------------------------|--------|------------------------------------|
| `/api/stencil/generate`           | POST   | Gera stencil a partir de imagem    |
| `/api/stencil/generate-idea`      | POST   | Gera arte de tatuagem por prompt   |
| `/api/stencil/refine-drawing`     | POST   | Refina desenho a mao livre         |
| `/api/adjust-stencil`             | POST   | Ajusta parametros do stencil       |

### Ferramentas

| Rota                         | Metodo | Descricao                         |
|------------------------------|--------|------------------------------------|
| `/api/tools/remove-bg`       | POST   | Remove fundo de imagem             |
| `/api/tools/enhance`         | POST   | Aprimora imagem para 4K            |
| `/api/tools/color-match`     | POST   | Analisa cores e sugere tintas      |
| `/api/tools/split-a4`        | POST   | Divide stencil em folhas A4        |
| `/api/image-resize`          | POST   | Redimensiona imagem                |

### Pagamentos (Asaas)

| Rota                              | Metodo | Descricao                     |
|-----------------------------------|--------|--------------------------------|
| `/api/payments/asaas-checkout`    | POST   | Cria checkout Asaas            |
| `/api/asaas/subscription`         | GET    | Dados da assinatura            |
| `/api/asaas/invoices`             | GET    | Lista faturas                  |
| `/api/asaas/cancel`               | POST   | Cancela assinatura             |
| `/api/webhooks/asaas`             | POST   | Webhook de pagamentos          |

### Usuarios e Projetos

| Rota                         | Metodo      | Descricao                     |
|------------------------------|-------------|--------------------------------|
| `/api/user/me`               | GET         | Dados do usuario logado        |
| `/api/user/status`           | GET         | Status rapido (plano, creditos)|
| `/api/projects`              | GET/POST    | Lista/cria projetos            |
| `/api/projects/[id]`         | GET/DELETE  | Busca/deleta projeto           |
| `/api/gallery`               | GET         | Galeria publica                |

### Storage (R2)

| Rota                    | Metodo | Descricao                          |
|-------------------------|--------|------------------------------------|
| `/api/r2/upload`        | POST   | Upload de imagem                   |
| `/api/r2/presign`       | POST   | Gera URL presigned para download   |
| `/api/r2/delete`        | DELETE | Deleta arquivo                     |
| `/api/r2/files`         | GET    | Lista arquivos do usuario          |

### Admin (~40 rotas)

Todas protegidas por `withAdminAuth`. Principais grupos:

- **Dashboard:** `/api/admin/dashboard/consolidated`, `/api/admin/metrics`, `/api/admin/stats`
- **Usuarios:** `/api/admin/users`, `/api/admin/users/[id]/logs`, `/api/admin/delete-user`, `/api/admin/merge-users`
- **Creditos:** `/api/admin/credits/add`, `/api/admin/credits/remove`, `/api/admin/credits/reset-usage`
- **Cortesia:** `/api/admin/courtesy/grant`, `/api/admin/courtesy/revoke`, `/api/admin/courtesy/list`
- **Financeiro:** `/api/admin/transactions`, `/api/admin/subscriptions`
- **Suporte:** `/api/admin/support`, `/api/admin/support/[id]`
- **Sistema:** `/api/admin/clear-cache`, `/api/admin/sentry`, `/api/admin/settings`

### Webhooks

| Rota                    | Validacao           | Descricao                     |
|-------------------------|---------------------|-------------------------------|
| `/api/webhooks/clerk`   | Svix (assinatura)   | Sync usuarios Clerk → Supabase|
| `/api/webhooks/asaas`   | Token Asaas         | Eventos de pagamento          |

---

## 6. Padroes de Codigo

### 6.1 Middleware de API (`withAuth` / `withAdminAuth`)

Toda rota de API deve usar um dos wrappers de `lib/api-middleware.ts`:

```typescript
// Rota autenticada (qualquer usuario)
export const POST = withAuth(async (req, { userId, user }) => {
  // `user` ja contem dados do Supabase (plano, creditos, etc.)
  return NextResponse.json({ data: ... });
});

// Rota admin
export const GET = withAdminAuth(async (req, { userId, adminId, adminEmail }) => {
  return NextResponse.json({ data: ... });
});
```

Os wrappers cuidam de: autenticacao (Clerk), busca/criacao do usuario (Supabase), error handling (Sentry), e resposta padronizada de erro.

### 6.2 Billing Pattern (`checkToolAccess`)

Todas as rotas de ferramentas seguem o mesmo padrao via `lib/billing/service.ts`:

```typescript
const billing = await checkToolAccess({
  userId,
  user,
  toolName: 'remove_bg',
  trialCheckFn: checkRemoveBackgroundLimit,
  trialDeniedMessage: 'Remocao de Fundo e exclusiva para assinantes.',
});
if (billing.denied) return billing.response;

// ... processar ferramenta ...

await billing.recordUsage();
```

### 6.3 Logger Estruturado

**Arquivo:** `lib/logger.ts`

- Em **desenvolvimento**: loga tudo no console
- Em **producao**: sanitiza dados sensiveis (email, CPF, tokens) e envia para Sentry
- Campos sensiveis sao automaticamente mascarados: `password`, `token`, `secret`, `apiKey`, `email`, `cpf`, `credit_card`, etc.
- Uso: `logger.info('[API] Mensagem', { contexto })`, `logger.error('[DB] Erro', error)`

### 6.4 Error Handling

- Wrappers `withAuth`/`withAdminAuth` capturam erros automaticamente
- Erros sao enviados ao Sentry com tags de contexto
- Respostas HTTP padronizadas: `{ error: string }` com status codes corretos
- Erros 500 retornam mensagem generica ("Erro interno do servidor")

---

## 7. Infraestrutura

### Deploy

```
Railway
├── App Service     → next start (porta 3000)
├── Worker Service  → tsx scripts/railway-worker.ts (BullMQ workers)
└── Redis           → Cache + Filas BullMQ

Supabase
├── PostgreSQL      → Banco principal (com RLS)
└── Storage         → Imagens legadas

Cloudflare
└── R2              → Storage principal de imagens

Clerk
└── Auth            → SSO, webhooks

Asaas
└── Payments        → PIX, Boleto, Cartao de credito

Sentry
└── Monitoring      → Erros, source maps, performance
```

### Configuracao de Build

- **next.config.js**: Sentry + next-intl plugins, compressao gzip, otimizacao de imagens WebP
- **Procfile**: `web: npm start` + `worker: npm run worker`
- **nixpacks.toml**: Configuracao de build para Railway
- **railway.json**: Configuracao de deploy

### Variaveis de Ambiente Necessarias

| Variavel                        | Servico      | Descricao                              |
|---------------------------------|--------------|-----------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase     | URL do projeto                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase     | Chave de servico (server-side)          |
| `NEXT_PUBLIC_CLERK_*`           | Clerk        | Chaves publicas do Clerk                |
| `CLERK_SECRET_KEY`              | Clerk        | Chave secreta do Clerk                  |
| `GEMINI_API_KEY`                | Google       | Chave da API Gemini                     |
| `REDIS_URL`                     | Railway      | URL de conexao Redis                    |
| `R2_ACCOUNT_ID`                 | Cloudflare   | Account ID do Cloudflare                |
| `R2_ACCESS_KEY_ID`              | Cloudflare   | Chave de acesso R2                      |
| `R2_SECRET_ACCESS_KEY`          | Cloudflare   | Chave secreta R2                        |
| `R2_BUCKET_NAME`                | Cloudflare   | Nome do bucket (blacklinepro-images)    |
| `ASAAS_API_KEY`                 | Asaas        | Chave da API de pagamentos              |
| `SENTRY_DSN`                    | Sentry       | DSN do projeto Sentry                   |
| `RESEND_API_KEY`                | Resend       | Chave da API de emails                  |

---

## 8. Seguranca

### CSRF Protection

O `middleware.ts` valida `Origin`/`Referer` em todas as requisicoes mutantes (POST, PUT, DELETE, PATCH):
- Comparacao exata de origin (evita bypass por subdominio)
- Webhooks sao excluidos (possuem validacao propria de assinatura)
- Requests sem Origin/Referer sao bloqueados (HTTP 403)

### Rate Limiting

**Arquivo:** `lib/ratelimit.ts`

- Implementado com Redis (sliding window)
- Cliente Redis dedicado (nao bloqueia fila BullMQ)
- Timeout rapido de 2s para conexao (nao trava o request)
- Aplicado nas rotas de geracao e ferramentas

### Row Level Security (RLS)

O Supabase PostgreSQL usa RLS para isolar dados por usuario:
- Usuarios so acessam seus proprios projetos e dados
- O `supabaseAdmin` (service role) bypassa RLS para operacoes administrativas
- Migrations em `migrations/` e `supabase/migrations/` configuram politicas RLS

### Admin Access Control

Dupla verificacao no middleware:
1. **Clerk metadata**: `publicMetadata.role === 'admin' || 'superadmin'`
2. **Email whitelist**: `ADMIN_EMAILS` em `lib/admin-config.ts`

Ambos sao verificados -- basta um para conceder acesso admin.

### Security Headers

Configurados em `next.config.js`:
- `Strict-Transport-Security` (HSTS com preload)
- `X-Frame-Options: DENY` (anti-clickjacking)
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy` (CSP restritivo)
- `Permissions-Policy` (camera, microphone, geolocation desabilitados)

---

## 9. Internacionalizacao (i18n)

**Arquivos:** `i18n/routing.ts`, `i18n/request.ts`, `messages/`

### Idiomas Suportados

| Codigo | Idioma     | Arquivo de traducao |
|--------|------------|---------------------|
| `pt`   | Portugues  | `messages/pt.json`  |
| `en`   | Ingles     | `messages/en.json`  |
| `es`   | Espanhol   | `messages/es.json`  |
| `fr`   | Frances    | `messages/fr.json`  |
| `it`   | Italiano   | `messages/it.json`  |
| `ja`   | Japones    | `messages/ja.json`  |

### Configuracao

- **Biblioteca:** `next-intl` v4.8
- **Locale padrao:** `pt` (sem prefixo na URL)
- **Estrategia de prefixo:** `as-needed` -- portugues em `/dashboard`, ingles em `/en/dashboard`
- **Deteccao automatica:** baseada no header `Accept-Language` do navegador
- **Middleware:** `next-intl` integrado ao `clerkMiddleware` -- roda apenas em rotas nao-API

---

## 10. Paginas (32 rotas)

### Dashboard (autenticadas)

| Rota                          | Descricao                            |
|-------------------------------|--------------------------------------|
| `/dashboard`                  | Dashboard principal do usuario       |
| `/editor`                     | Editor de stencil (upload + geracao) |
| `/editor-advanced`            | Editor avancado                      |
| `/generator`                  | Gerador de ideias por IA             |
| `/tools`                      | Ferramentas (remove-bg, enhance...) |
| `/assinatura`                 | Gestao da assinatura                 |
| `/faturas`                    | Historico de faturas                 |
| `/organization`               | Gestao de organizacao (Studio)       |
| `/suporte`                    | Tickets de suporte                   |

### Admin

| Rota                          | Descricao                            |
|-------------------------------|--------------------------------------|
| `/admin`                      | Painel administrativo principal      |
| `/admin/users`                | Gestao de usuarios                   |
| `/admin/finance`              | Dashboard financeiro                 |
| `/admin/credits`              | Gestao de creditos                   |
| `/admin/courtesy`             | Cortesias administrativas            |
| `/admin/generations`          | Log de geracoes                      |
| `/admin/audit`                | Auditoria                            |
| `/admin/settings`             | Configuracoes do sistema             |
| `/admin/suporte`              | Suporte admin                        |

### Publicas

| Rota                | Descricao                          |
|---------------------|------------------------------------|
| `/`                 | Landing page                       |
| `/pricing`          | Pagina de precos                   |
| `/success`          | Pos-pagamento                      |
| `/invite/[token]`   | Convite para organizacao           |
| `/unsubscribe`      | Descadastrar de emails             |

### Legais

| Rota             | Descricao              |
|------------------|------------------------|
| `/termos`        | Termos de uso          |
| `/privacidade`   | Politica de privacidade|
| `/cookies`       | Politica de cookies    |
| `/reembolso`     | Politica de reembolso  |

---

## 11. Scripts de Operacao

O `package.json` define scripts utilitarios:

| Script                    | Comando                                  | Descricao                          |
|---------------------------|------------------------------------------|------------------------------------|
| `npm run dev`             | `next dev`                               | Servidor de desenvolvimento        |
| `npm run build`           | `next build`                             | Build de producao                  |
| `npm run worker`          | `tsx scripts/railway-worker.ts`          | Inicia workers BullMQ              |
| `npm run remarketing`     | `tsx scripts/send-remarketing-emails.ts` | Envia emails de remarketing        |
| `npm run remarketing:auto`| `tsx scripts/automated-remarketing.ts`   | Remarketing automatizado           |
| `npm run diagnose:db`     | `tsx scripts/diagnose-database.ts`       | Diagnostico do banco de dados      |
| `npm run cleanup`         | `tsx scripts/cleanup-old-data.ts`        | Limpeza de dados antigos           |
| `npm run email:dev`       | `email dev --dir emails`                 | Preview de emails (React Email)    |

---

## 12. Dependencias Principais

| Pacote                       | Versao   | Uso                                  |
|------------------------------|----------|---------------------------------------|
| `next`                       | 15.5.9   | Framework full-stack                  |
| `@clerk/nextjs`              | 6.37     | Autenticacao                          |
| `@supabase/supabase-js`      | 2.43     | Cliente PostgreSQL                    |
| `@google/generative-ai`      | 0.11     | Google Gemini SDK                     |
| `bullmq`                     | 5.66     | Fila de jobs                          |
| `ioredis`                    | 5.9      | Cliente Redis                         |
| `@aws-sdk/client-s3`         | 3.x      | Cloudflare R2 (API S3-compatible)     |
| `sharp`                      | 0.34     | Processamento de imagens              |
| `next-intl`                  | 4.8      | Internacionalizacao                   |
| `resend`                     | 6.6      | Envio de emails                       |
| `react-email`                | 5.1      | Templates de email                    |
| `zod`                        | 4.3      | Validacao de schemas                  |
| `@sentry/nextjs`             | 10.38    | Monitoramento de erros                |
| `recharts`                   | 3.7      | Graficos do admin dashboard           |
| `perfect-freehand`           | 1.2      | Desenho vetorial a mao livre          |
| `jspdf`                      | 4.0      | Geracao de PDFs (split A4)            |
| `@techstark/opencv-js`       | 4.12     | Processamento de imagem client-side   |
| `svix`                       | 1.21     | Validacao de webhooks Clerk           |
