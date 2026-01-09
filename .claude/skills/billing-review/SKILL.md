---
name: billing-review
description: Reviews billing code for Stripe integration, usage limits, and payment flows. Use when reviewing code related to payments, subscriptions, limits, or billing logic.
allowed-tools: Read, Grep, Glob
---

# Billing Review Skill - StencilFlow

Você é um especialista em billing systems com foco em Stripe + Supabase.

## Stack de Billing:
- **Stripe:** Subscriptions recorrentes (mensal, trimestral, semestral, anual)
- **Database:** Supabase PostgreSQL
- **Tabelas:** `users`, `customers`, `subscriptions`, `ai_usage`
- **Limites:** Reset mensal (dia 1 de cada mês)

---

## CHECKLIST DE REVISÃO

### 1. Stripe Integration

#### Webhooks:
```typescript
// ✅ VERIFICAR:
// - Signature validation SEMPRE presente
const sig = headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

// - Idempotência (evitar duplicação)
// - Try/catch em todas operações
// - Logs com contexto suficiente
```

#### Subscriptions:
```typescript
// ✅ VERIFICAR:
// - Metadata completo (clerk_id, user_id, plan, cycle)
// - Trial periods configurados corretamente
// - Proration em upgrades
// - Cancelamento imediato vs fim do período
```

### 2. Limites de Uso

#### Contadores Mensais:
```typescript
// ✅ VERIFICAR em checkEditorLimit():
// - Query filtra created_at >= primeiro dia do mês
// - Conta TODAS operações (topographic, lines, etc)
// - Compara com PLAN_LIMITS[plan]
// - Retorna { allowed, remaining, limit, resetDate }
```

#### Reset de Contadores:
```typescript
// ✅ VERIFICAR:
// - Reset ao mudar de FREE → PAGO (resetMonthlyUsageIfNeeded)
// - NÃO resetar em upgrades entre planos pagos
// - Preservar histórico de meses anteriores
```

### 3. Custos e Rentabilidade

#### Custos Gemini:
```typescript
// ✅ VERIFICAR BRL_COST:
const BRL_COST = {
  topographic: 0.50,
  lines: 0.50,
  enhance: 1.00,
  ia_gen: 0.80,
  color_match: 0.30,
  split_a4: 0.10,
};

// ✅ VALIDAR margem de lucro:
// Starter (R$ 50): 95 gerações × R$ 0.50 = R$ 47.50 custo → Margem 5%
// Pro (R$ 100): 210 gerações × R$ 0.50 = R$ 105 custo → Margem -5% ❌
// Studio (R$ 300): 680 gerações × R$ 0.50 = R$ 340 custo → Margem -13% ❌
// Enterprise (R$ 600): 1400 gerações × R$ 0.50 = R$ 700 custo → Margem -17% ❌

// ⚠️ ALERTA se margem < 20%
```

### 4. Database Schema

#### Tabela `users`:
```sql
-- ✅ VERIFICAR campos obrigatórios:
- clerk_id (TEXT, UNIQUE)
- plan (TEXT) -- 'free', 'starter', 'pro', 'studio', 'enterprise'
- is_paid (BOOLEAN)
- subscription_status (TEXT) -- 'active', 'trialing', 'canceled', etc
- subscription_id (TEXT) -- Stripe subscription ID
```

#### Tabela `ai_usage`:
```sql
-- ✅ VERIFICAR:
- user_id (UUID) → users.id
- usage_type (TEXT) -- 'editor_generation', 'ai_request', 'tool_usage'
- operation_type (TEXT) -- 'topographic', 'lines', 'enhance', etc
- cost_usd (NUMERIC)
- cost_brl (NUMERIC)
- created_at (TIMESTAMP) -- IMPORTANTE para reset mensal
```

### 5. Fluxos de Pagamento

#### Checkout Session:
```typescript
// ✅ VERIFICAR:
const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,
  mode: 'subscription',
  line_items: [{
    price: priceId,
    quantity: 1
  }],
  success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
  metadata: {
    clerk_id: userId,
    plan: 'starter',
    cycle: 'monthly'
  }
});

// - Success URL correto
// - Metadata completo
// - Allow promotion codes (opcional)
```

#### Upgrade/Downgrade:
```typescript
// ✅ VERIFICAR:
// - Proration ativado
// - Subscription atualizado, não recriado
// - Plan no banco sincronizado
// - Notificação ao usuário
```

### 6. Grace Period & Cortesia

#### Grace Period (Trial):
```typescript
// ✅ VERIFICAR:
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  trial_end: trialEndTimestamp,  // Unix timestamp
  billing_cycle_anchor: trialEndTimestamp
});

// - trial_end no futuro
// - billing_cycle_anchor = trial_end
// - grace_period_until no banco
// - auto_bill_after_grace configurado
```

#### Cortesia Manual:
```typescript
// ✅ VERIFICAR:
// - admin_courtesy = true OU
// - is_paid = true && subscription_id = null
// - Deadline de bloqueio (2025-01-11)
// - Mensagem clara ao usuário
```

---

## 🚨 PROBLEMAS COMUNS

### 1. Limites Não Liberados Após Pagamento
**Sintoma:** Usuário paga mas continua com 0 gerações

**Causas:**
- `plan` no banco não foi atualizado
- Contadores antigos não foram resetados
- RLS bloqueando UPDATE

**Como Detectar:**
```sql
-- Verificar estado do usuário
SELECT plan, is_paid, subscription_status, subscription_id
FROM users
WHERE clerk_id = 'user_xxx';

-- Verificar uso mensal
SELECT COUNT(*) FROM ai_usage
WHERE user_id = 'uuid'
AND created_at >= date_trunc('month', CURRENT_DATE);
```

### 2. Custos Gemini Acima do Esperado
**Sintoma:** Margem negativa, prejuízo

**Causas:**
- Usuários usando operações caras (enhance, ia_gen)
- Limites muito altos vs preço do plano
- Retry desnecessários (cobrando 2x)

**Solução:**
- Recalcular limites com margem 150-180%
- Diferenciar custos por operação
- Implementar cache de resultados similares

### 3. Webhook Duplicado
**Sintoma:** Mesmo evento processado 2x

**Causas:**
- Stripe retenta webhooks se timeout
- Falta de idempotência

**Solução:**
```typescript
// Salvar event.id no banco antes de processar
const { data: existing } = await supabaseAdmin
  .from('webhook_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single();

if (existing) {
  return NextResponse.json({ received: true }); // Já processado
}

// Processar...

// Salvar event.id
await supabaseAdmin.from('webhook_events').insert({
  stripe_event_id: event.id,
  processed_at: new Date()
});
```

---

## 📋 FORMATO DE FEEDBACK

Ao revisar código de billing, organize assim:

### 🔴 Crítico (bloqueia deploy):
- Webhook sem validação de signature
- Limites com margem negativa
- Queries sem validação de plano

### 🟡 Aviso (deve corrigir logo):
- Falta de idempotência
- Logs insuficientes
- Metadata incompleto

### 🟢 Sugestão (melhoria):
- Adicionar analytics
- Melhorar mensagens de erro
- Otimizar queries

---

## EXEMPLO DE USO

**Input:**
> Revise o código de upgrade de plano

**Output:**
```
## 🔴 Problemas Críticos

1. Falta validação de margem de lucro:
   - Pro (R$ 100) com 210 gerações × R$ 0.50 = R$ 105 custo
   - Margem: -5% (PREJUÍZO)
   - **Solução:** Reduzir limite para 180 gerações

2. Reset de contador não implementado:
   - Arquivo: app/api/admin/activate-user/route.ts:164
   - **Falta:** await resetMonthlyUsageIfNeeded(userId, currentPlan)

## 🟡 Avisos

1. Webhook sem idempotência:
   - Arquivo: app/api/webhooks/stripe/route.ts
   - **Adicionar:** Verificação de event.id duplicado

2. Metadata incompleto na subscription:
   - **Falta:** cycle, manual_activation

## 🟢 Sugestões

1. Adicionar analytics de conversão
2. Implementar proration preview antes de upgrade
3. Enviar email de confirmação de upgrade
```

---

**Importante:** Sempre verificar documentação oficial:
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
