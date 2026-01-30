# Plano de Migração: Stripe → Asaas

## Resumo Executivo

Migração do sistema de pagamentos do Stripe para Asaas, mantendo todas as funcionalidades existentes e adicionando suporte nativo a PIX.

## 1. Comparativo de APIs

### Endpoints Base

| Ambiente | Stripe | Asaas |
|----------|--------|-------|
| Produção | `https://api.stripe.com` | `https://api.asaas.com/v3` |
| Sandbox | N/A (test keys) | `https://api-sandbox.asaas.com/v3` |

### Autenticação

| Stripe | Asaas |
|--------|-------|
| `Authorization: Bearer sk_xxx` | `access_token: $aact_xxx` |
| API keys: `sk_test_*` / `sk_live_*` | API keys: `$aact_hmlg_*` / `$aact_prod_*` |

### Mapeamento de Recursos

| Conceito | Stripe | Asaas |
|----------|--------|-------|
| Cliente | `Customer` | `Customer` |
| Assinatura | `Subscription` | `Subscription` |
| Pagamento | `PaymentIntent` / `Invoice` | `Payment` (Cobrança) |
| Método de Pagamento | `PaymentMethod` | `billingType` |
| Checkout | `Checkout Session` | `Checkout Asaas` / `PaymentLink` |
| Portal do Cliente | `BillingPortal` | N/A (gerenciar via API) |

---

## 2. Mapeamento de Ciclos de Cobrança

| StencilFlow | Stripe (interval) | Asaas (cycle) |
|-------------|-------------------|---------------|
| `monthly` | `month` | `MONTHLY` |
| `quarterly` | 3 months | `QUARTERLY` |
| `semiannual` | 6 months | `SEMIANNUALLY` |
| `yearly` | `year` | `YEARLY` |

---

## 3. Mapeamento de Status

### Status de Assinatura

| Stripe | Asaas | Ação |
|--------|-------|------|
| `active` | `ACTIVE` | Acesso liberado |
| `trialing` | N/A | Usar `nextDueDate` futuro |
| `past_due` | `OVERDUE` | Alerta ao usuário |
| `canceled` | `INACTIVE` | Revogar acesso |
| `unpaid` | `OVERDUE` | Alerta ao usuário |
| `incomplete` | `PENDING` | Aguardando pagamento |

### Status de Pagamento

| Stripe | Asaas | Significado |
|--------|-------|-------------|
| `succeeded` | `RECEIVED` | Pagamento confirmado |
| `pending` | `PENDING` | Aguardando (boleto/PIX) |
| `failed` | `REFUNDED` / Erro | Falha no pagamento |
| `canceled` | `DELETED` | Cancelado |

---

## 4. Mapeamento de Webhooks

### Eventos de Pagamento

| Stripe Event | Asaas Event | Handler |
|--------------|-------------|---------|
| `checkout.session.completed` | `PAYMENT_RECEIVED` | Ativar usuário |
| `checkout.session.async_payment_succeeded` | `PAYMENT_RECEIVED` | Ativar (boleto pago) |
| `invoice.payment_succeeded` | `PAYMENT_RECEIVED` | Renovação |
| `invoice.payment_failed` | `PAYMENT_OVERDUE` | Marcar past_due |
| `invoice.created` | `PAYMENT_CREATED` | Gerar boleto/PIX |

### Eventos de Assinatura

| Stripe Event | Asaas Event | Handler |
|--------------|-------------|---------|
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` | Criar registro |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` | Atualizar status |
| `customer.subscription.deleted` | `SUBSCRIPTION_DELETED` | Cancelar acesso |

### Payload do Webhook Asaas

```json
{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_xxx",
    "customer": "cus_xxx",
    "subscription": "sub_xxx",
    "value": 100.00,
    "billingType": "PIX",
    "status": "RECEIVED",
    "dueDate": "2025-01-15",
    "paymentDate": "2025-01-10",
    "invoiceUrl": "https://...",
    "pixQrCode": {...}
  }
}
```

---

## 5. Estrutura de Arquivos a Criar/Modificar

### Novos Arquivos

```
lib/
├── asaas/
│   ├── client.ts              # Cliente HTTP configurado
│   ├── types.ts               # Tipos TypeScript
│   ├── customer-service.ts    # CRUD de clientes
│   ├── subscription-service.ts # Gerenciamento de assinaturas
│   ├── payment-service.ts     # Cobranças e PIX
│   ├── checkout-service.ts    # Checkout e links de pagamento
│   └── index.ts               # Exports

app/api/
├── webhooks/
│   └── asaas/
│       └── route.ts           # Handler de webhooks Asaas
├── payments/
│   ├── create-asaas-checkout/
│   │   └── route.ts           # Criar checkout Asaas
│   ├── create-asaas-subscription/
│   │   └── route.ts           # Criar assinatura com cartão
│   └── pix/
│       └── route.ts           # Gerar cobrança PIX

components/
├── AsaasCheckoutModal.tsx     # Modal de checkout Asaas
└── PixPaymentModal.tsx        # Modal específico para PIX
```

### Arquivos a Modificar

```
.env.local                     # Adicionar variáveis Asaas
lib/billing/plans.ts           # Manter (não depende de Stripe)
components/CheckoutModal.tsx   # Substituir por AsaasCheckoutModal
app/(dashboard)/assinatura/    # Atualizar para usar Asaas
```

---

## 6. Variáveis de Ambiente

### Remover (Stripe)
```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER_MONTHLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_STUDIO_MONTHLY=
# ... outros price IDs
```

### Adicionar (Asaas)
```env
# Asaas API
ASAAS_API_KEY=              # $aact_prod_xxx ou $aact_hmlg_xxx
ASAAS_ENVIRONMENT=sandbox   # 'sandbox' ou 'production'
ASAAS_WEBHOOK_TOKEN=        # Token para validar webhooks

# URLs (opcionais, calculadas automaticamente)
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
```

---

## 7. Implementação Detalhada

### 7.1 Cliente Asaas (`lib/asaas/client.ts`)

```typescript
const ASAAS_BASE_URL = process.env.ASAAS_ENVIRONMENT === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

export async function asaasRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${ASAAS_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.ASAAS_API_KEY!,
      'User-Agent': 'StencilFlow/1.0',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.description || 'Asaas API Error');
  }

  return response.json();
}
```

### 7.2 Criar Cliente (`lib/asaas/customer-service.ts`)

```typescript
interface CreateCustomerParams {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  externalReference?: string; // clerk_id ou user_id
}

export async function createCustomer(params: CreateCustomerParams) {
  return asaasRequest<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
```

### 7.3 Criar Assinatura (`lib/asaas/subscription-service.ts`)

```typescript
interface CreateSubscriptionParams {
  customer: string;           // ID do cliente Asaas
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: number;
  nextDueDate: string;        // YYYY-MM-DD
  cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description: string;
  externalReference?: string;
  // Para cartão de crédito:
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
  // Ou usar token existente:
  creditCardToken?: string;
}

export async function createSubscription(params: CreateSubscriptionParams) {
  return asaasRequest<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
```

### 7.4 Gerar PIX (`lib/asaas/payment-service.ts`)

```typescript
export async function createPixPayment(params: {
  customer: string;
  value: number;
  dueDate: string;
  description: string;
}) {
  // 1. Criar cobrança
  const payment = await asaasRequest<AsaasPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      billingType: 'PIX',
    }),
  });

  // 2. Buscar QR Code
  const pixData = await asaasRequest<AsaasPixQrCode>(
    `/payments/${payment.id}/pixQrCode`
  );

  return {
    payment,
    qrCode: {
      encodedImage: pixData.encodedImage,  // Base64 do QR Code
      payload: pixData.payload,             // Código copia-e-cola
      expirationDate: pixData.expirationDate,
    },
  };
}
```

### 7.5 Webhook Handler (`app/api/webhooks/asaas/route.ts`)

```typescript
export async function POST(req: Request) {
  const body = await req.json();
  const token = req.headers.get('asaas-access-token');

  // Validar token
  if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { event, payment, subscription } = body;

  // Idempotência
  const eventId = `${event}_${payment?.id || subscription?.id}_${Date.now()}`;
  // ... verificar se já processado

  switch (event) {
    case 'PAYMENT_RECEIVED':
      await handlePaymentReceived(payment);
      break;
    case 'PAYMENT_OVERDUE':
      await handlePaymentOverdue(payment);
      break;
    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
      await handlePaymentCanceled(payment);
      break;
    case 'SUBSCRIPTION_CREATED':
      await handleSubscriptionCreated(subscription);
      break;
    case 'SUBSCRIPTION_UPDATED':
      await handleSubscriptionUpdated(subscription);
      break;
    case 'SUBSCRIPTION_DELETED':
    case 'SUBSCRIPTION_INACTIVATED':
      await handleSubscriptionCanceled(subscription);
      break;
  }

  return new Response('OK', { status: 200 });
}

async function handlePaymentReceived(payment: AsaasPayment) {
  // 1. Buscar usuário pelo externalReference ou customer
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('asaas_customer_id', payment.customer)
    .single();

  if (!user) throw new Error('User not found');

  // 2. Determinar plano pelo valor ou metadata
  const plan = getPlanFromValue(payment.value);

  // 3. Ativar usuário
  await activateUserAtomic(user.id, plan, {
    isPaid: true,
    toolsUnlocked: plan === 'pro' || plan === 'studio',
    subscriptionStatus: 'active',
  });

  // 4. Registrar pagamento
  await supabaseAdmin.from('payments').insert({
    user_id: user.id,
    asaas_payment_id: payment.id,
    asaas_subscription_id: payment.subscription,
    amount: payment.value,
    status: 'succeeded',
    payment_method: payment.billingType.toLowerCase(),
    plan_type: plan,
  });
}
```

---

## 8. Fluxo de Checkout

### 8.1 Fluxo com Cartão de Crédito

```
1. Usuário seleciona plano
2. Frontend coleta dados do cartão
3. POST /api/payments/create-asaas-subscription
   - Criar customer (se não existir)
   - Criar subscription com creditCard
4. Asaas valida cartão e cria assinatura
5. Webhook SUBSCRIPTION_CREATED recebido
6. Webhook PAYMENT_RECEIVED recebido (1ª cobrança)
7. Usuário ativado
```

### 8.2 Fluxo com PIX

```
1. Usuário seleciona plano + PIX
2. POST /api/payments/pix
   - Criar customer (se não existir)
   - Criar cobrança PIX
   - Retornar QR Code
3. Frontend exibe QR Code
4. Usuário paga via app do banco
5. Webhook PAYMENT_RECEIVED recebido
6. Usuário ativado
7. Criar assinatura para próximos meses (PIX recorrente)
```

### 8.3 Fluxo com Boleto

```
1. Usuário seleciona plano + Boleto
2. POST /api/payments/create-asaas-subscription
   - Criar customer
   - Criar subscription com billingType: 'BOLETO'
3. Asaas gera boleto
4. Webhook PAYMENT_CREATED com invoiceUrl
5. Usuário acessa boleto e paga
6. Webhook PAYMENT_RECEIVED recebido (3-5 dias depois)
7. Usuário ativado
```

---

## 9. Migração de Dados

### 9.1 Tabela `users` - Novas Colunas

```sql
ALTER TABLE users ADD COLUMN asaas_customer_id TEXT;
ALTER TABLE users ADD COLUMN asaas_subscription_id TEXT;

-- Índices
CREATE INDEX idx_users_asaas_customer ON users(asaas_customer_id);
CREATE INDEX idx_users_asaas_subscription ON users(asaas_subscription_id);
```

### 9.2 Tabela `customers` - Adaptar

```sql
-- Renomear ou adicionar coluna
ALTER TABLE customers ADD COLUMN asaas_customer_id TEXT;
-- Manter stripe_customer_id para histórico
```

### 9.3 Tabela `subscriptions` - Adaptar

```sql
ALTER TABLE subscriptions ADD COLUMN asaas_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN asaas_customer_id TEXT;
-- Manter stripe_* para histórico
```

### 9.4 Tabela `payments` - Adaptar

```sql
ALTER TABLE payments ADD COLUMN asaas_payment_id TEXT;
ALTER TABLE payments ADD COLUMN asaas_subscription_id TEXT;
ALTER TABLE payments ADD COLUMN pix_qr_code TEXT;
ALTER TABLE payments ADD COLUMN pix_payload TEXT;
-- Manter stripe_* para histórico
```

---

## 10. Checklist de Implementação

### Fase 1: Infraestrutura (1-2 dias)
- [ ] Criar conta Asaas Sandbox
- [ ] Gerar API Key de teste
- [ ] Configurar variáveis de ambiente
- [ ] Criar `lib/asaas/client.ts`
- [ ] Criar `lib/asaas/types.ts`

### Fase 2: Serviços Core (2-3 dias)
- [ ] Implementar `customer-service.ts`
- [ ] Implementar `subscription-service.ts`
- [ ] Implementar `payment-service.ts` (PIX)
- [ ] Implementar `checkout-service.ts`
- [ ] Testes unitários

### Fase 3: Webhooks (1-2 dias)
- [ ] Criar `/api/webhooks/asaas/route.ts`
- [ ] Implementar handlers para todos os eventos
- [ ] Idempotência com `webhook_events`
- [ ] Configurar webhook no painel Asaas
- [ ] Testar com eventos simulados

### Fase 4: Frontend (2-3 dias)
- [ ] Criar `AsaasCheckoutModal.tsx`
- [ ] Criar `PixPaymentModal.tsx` com QR Code
- [ ] Adaptar página de assinatura
- [ ] Adaptar página de pricing
- [ ] Testar fluxos completos

### Fase 5: Migração de Banco (1 dia)
- [ ] Criar migrations para novas colunas
- [ ] Script para migrar customers existentes
- [ ] Script para migrar subscriptions ativas

### Fase 6: Testes E2E (2-3 dias)
- [ ] Testar assinatura com cartão
- [ ] Testar assinatura com PIX
- [ ] Testar assinatura com boleto
- [ ] Testar renovação automática
- [ ] Testar cancelamento
- [ ] Testar upgrade/downgrade

### Fase 7: Deploy (1 dia)
- [ ] Criar conta Asaas Produção
- [ ] Migrar API Keys
- [ ] Configurar webhook de produção
- [ ] Deploy gradual (feature flag)
- [ ] Monitorar logs

---

## 11. Considerações Importantes

### 11.1 Diferenças Críticas

1. **Sem Stripe Elements**: Asaas não tem SDK frontend. Coletar dados do cartão diretamente (requer HTTPS).

2. **Tokenização**: Precisa solicitar ativação ao gerente de conta Asaas para produção.

3. **PIX Instantâneo**: Confirmação em segundos via webhook (muito mais rápido que boleto).

4. **Sem Customer Portal**: Gerenciar assinaturas via sua própria interface + API.

5. **Cobranças Antecipadas**: Asaas gera cobranças 40 dias antes do vencimento por padrão.

### 11.2 Vantagens do Asaas

1. **PIX Nativo**: QR Code dinâmico com confirmação instantânea
2. **Taxas Menores**: Especialmente para PIX
3. **Boleto**: Processo mais simples que Stripe
4. **Suporte Local**: Atendimento em português
5. **Split de Pagamentos**: Nativo na plataforma

### 11.3 Desvantagens

1. **Sem SDK Frontend**: Mais trabalho para coletar cartão
2. **Documentação**: Menos exemplos que Stripe
3. **Menos Integrações**: Ecossistema menor
4. **Sem Apple Pay/Google Pay**: Apenas cartão, PIX, boleto

---

## 12. Rollback Plan

Caso necessário reverter:

1. Manter código Stripe comentado (não deletar)
2. Manter variáveis de ambiente Stripe
3. Feature flag para alternar entre gateways
4. Manter tabelas com campos de ambos

```typescript
// lib/billing/gateway.ts
export function getPaymentGateway() {
  return process.env.PAYMENT_GATEWAY === 'asaas' ? AsaasService : StripeService;
}
```

---

## Referências

- [Asaas API - Começar](https://docs.asaas.com/reference/comece-por-aqui)
- [Asaas - Autenticação](https://docs.asaas.com/docs/autentica%C3%A7%C3%A3o-1)
- [Asaas - Sandbox](https://docs.asaas.com/docs/sandbox)
- [Asaas - Assinaturas](https://docs.asaas.com/docs/assinaturas)
- [Asaas - Cobrança via PIX](https://docs.asaas.com/docs/cobrancas-via-pix)
- [Asaas - Webhooks](https://docs.asaas.com/docs/sobre-os-webhooks)
- [Asaas - Eventos de Cobrança](https://docs.asaas.com/docs/webhook-para-cobrancas)
- [Asaas - Eventos de Assinatura](https://docs.asaas.com/docs/eventos-para-assinaturas)
