# StencilFlow - Instruções do Projeto

## 📋 Sobre o Projeto

**StencilFlow** é uma plataforma SaaS para criação de stencils de tatuagem usando IA.

### Stack Tecnológica:
- **Frontend:** Next.js 14 App Router + TypeScript (strict mode)
- **Autenticação:** Clerk (JWT, webhooks)
- **Database:** Supabase (PostgreSQL + Row Level Security)
- **Billing:** Stripe (subscriptions recorrentes)
- **IA:** Google Gemini AI (processamento de imagens)
- **Jobs:** BullMQ + Redis (Railway/Upstash)
- **Cache:** Railway Redis (TCP) + Upstash (fallback)
- **Monitoring:** Sentry
- **Email:** React Email + Resend

---

## 🔒 PADRÕES DE SEGURANÇA (CRÍTICO)

### 1. Autenticação (Clerk)
```typescript
// ✅ SEMPRE validar JWT em API routes
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
if (!userId) {
  return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
}
```

### 2. Database (Supabase)
```typescript
// ✅ SEMPRE usar supabaseAdmin (service role)
import { supabaseAdmin } from '@/lib/supabase';

// ✅ Row Level Security (RLS) DEVE estar habilitado
// ❌ NUNCA expor service_role_key no cliente
// ❌ NUNCA fazer queries diretas sem validação
```

### 3. Billing (Stripe)
```typescript
// ✅ SEMPRE validar webhook signatures
const sig = headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig, secret);

// ✅ SEMPRE verificar idempotência
// ✅ SEMPRE usar try/catch em operações Stripe
```

### 4. IA (Gemini)
```typescript
// ✅ SEMPRE validar inputs antes de enviar
// ❌ NUNCA logar API keys
// ✅ SEMPRE ter rate limiting por usuário
// ✅ SEMPRE calcular custos ANTES de processar
```

---

## 📐 PADRÕES DE CÓDIGO

### TypeScript
- ✅ Strict mode habilitado
- ✅ Evitar `any` - usar tipos específicos ou `unknown`
- ✅ Validar todos argumentos em funções públicas
- ✅ Usar tipos do Supabase gerados

### API Routes
```typescript
// Estrutura padrão:
export async function POST(req: Request) {
  try {
    // 1. Autenticação
    const { userId } = await auth();
    if (!userId) return 401;

    // 2. Rate Limiting
    const limiter = createStencilLimiter(userPlan);
    const rateLimitCheck = await checkRateLimit(limiter, userId);
    if (!rateLimitCheck.success) return 429;

    // 3. Validação de Input
    const body = await req.json();
    // validar schema

    // 4. Verificar Limites de Uso
    const limitCheck = await checkEditorLimit(userId);
    if (!limitCheck.allowed) return 429;

    // 5. Processar
    const result = await processStencil(data);

    // 6. Registrar Uso
    await recordUsage({ userId, type: 'editor_generation', cost });

    // 7. Retornar
    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('[API] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Database Queries
```typescript
// ✅ BOM: Select específico com índices
const { data } = await supabaseAdmin
  .from('users')
  .select('id, plan, is_paid')
  .eq('clerk_id', userId)
  .single();

// ❌ RUIM: Select *
const { data } = await supabaseAdmin
  .from('users')
  .select('*');

// ✅ BOM: Usar indexes
// Verificar EXPLAIN ANALYZE antes de queries complexas
```

### Background Jobs (BullMQ)
```typescript
// ✅ SEMPRE ter retry strategy
// ✅ SEMPRE ter timeout
// ✅ SEMPRE logar contexto em erros
// ✅ SEMPRE usar deadletter queue
```

---

## 🏗️ ORGANIZAÇÃO DO CÓDIGO

### Pastas Principais:
```
app/
├── (dashboard)/     # Rotas autenticadas
├── api/             # API endpoints
└── success/         # Páginas públicas

lib/
├── admin/           # Utilities admin
├── billing/         # Lógica de billing
├── stripe/          # Serviços Stripe
├── auth.ts          # Helpers Clerk
├── gemini.ts        # Integração Gemini
├── queue.ts         # BullMQ queues
└── supabase.ts      # Cliente Supabase
```

### Convenções de Nomenclatura:
- **API Routes:** `route.ts` (padrão Next.js 14)
- **Components:** `PascalCase.tsx`
- **Utils:** `camelCase.ts`
- **Types:** `types.ts` ou `*.types.ts`
- **Constants:** `UPPER_SNAKE_CASE`

---

## 💰 SISTEMA DE BILLING

### Planos:
- **Free:** 0 gerações (bloqueado)
- **Legacy:** 100 gerações/mês (descontinuado)
- **Starter:** 95 gerações/mês (R$ 50)
- **Pro:** 210 gerações/mês (R$ 100)
- **Studio:** 680 gerações/mês (R$ 300)
- **Enterprise:** 1.400 gerações/mês (R$ 600)

### Contadores:
- **Mensal:** Reseta dia 1 de cada mês
- **Tabela:** `ai_usage` (user_id, usage_type, operation_type, cost, created_at)
- **Função:** `checkEditorLimit(userId)` → { allowed, remaining, limit }

### Custos Gemini (por operação):
```typescript
export const BRL_COST = {
  topographic: 0.50,    // Modo topográfico
  lines: 0.50,          // Modo linhas perfeitas
  enhance: 1.00,        // Aprimorar 4K
  ia_gen: 0.80,         // IA Gen
  color_match: 0.30,    // Color Match
  split_a4: 0.10,       // Dividir A4
};
```

---

## 🚨 PROBLEMAS CONHECIDOS (NÃO REPETIR)

### 1. Admin Page Gigante
- **Problema:** `/app/(dashboard)/admin/page.tsx` tem 2239 linhas
- **Solução:** Componentizar em módulos menores
- **Status:** Pendente refatoração

### 2. Limites Não Liberados
- **Problema:** Mudar plano não resetava contadores
- **Solução:** `resetMonthlyUsageIfNeeded()` em `lib/admin/user-activation.ts`
- **Status:** ✅ Corrigido (08/01/2026)

### 3. Redis Duplicado
- **Problema:** Upstash cobrando US$ 12/mês desnecessariamente
- **Solução:** Migrar para Railway Redis (grátis)
- **Status:** ✅ Corrigido (08/01/2026)

### 4. BullMQ Não Usado
- **Problema:** Filas configuradas mas rotas processam direto (síncrono)
- **Solução:** Implementar processamento assíncrono nas rotas
- **Status:** ⚠️ Planejado (Fase 2)

---

## 🧪 TESTES

### Rodar Testes:
```bash
npm run test              # Todos os testes
npm run test:watch        # Watch mode
npm run test -- db        # Testes de database
```

### Áreas Críticas para Testar:
- Billing (Stripe webhooks, upgrades, downgrades)
- Limites de uso (reset mensal, contadores)
- Autenticação (Clerk JWT, RLS)
- Background jobs (retry, timeout, deadletter)

---

## 📦 DEPLOY

### Ambientes:
- **Development:** `npm run dev`
- **Staging:** Vercel (branch `staging`)
- **Production:** Vercel (branch `main`)
- **Workers:** Railway (BullMQ workers)

### Checklist de Deploy:
- [ ] Testes passando (`npm run build`)
- [ ] Variáveis de ambiente configuradas
- [ ] Database migrations aplicadas
- [ ] Stripe webhooks configurados
- [ ] Clerk webhooks configurados
- [ ] Railway workers rodando

---

## 📚 COMANDOS ÚTEIS

```bash
# Desenvolvimento
npm run dev                        # Dev server
npm run build                      # Build de produção
npm run lint                       # ESLint

# Stripe
npm run stripe:listen              # Webhook listener
npm run stripe:trigger             # Trigger evento teste
npm run stripe:create-prices       # Criar preços

# Database
npx supabase gen types typescript  # Gerar tipos
```

---

## 🔗 LINKS IMPORTANTES

- **Vercel:** https://vercel.com/dashboard
- **Supabase:** https://supabase.com/dashboard
- **Stripe:** https://dashboard.stripe.com
- **Clerk:** https://dashboard.clerk.com
- **Railway:** https://railway.app/dashboard
- **Sentry:** https://sentry.io

---

**Última atualização:** 08/01/2026
**Versão:** 2.0.0
