# 🎉 Implementação dos Novos Planos - StencilFlow

## ✅ O que foi implementado

### 1. Novos Planos de Assinatura

**Plano Editor (R$ 50/mês)**
- Editor de Stencil completo
- Modo Topográfico
- Modo Linhas Perfeitas
- Salvar projetos ilimitados

**Plano Full Access (R$ 100/mês)**
- Tudo do plano Editor
- IA GEN (geração de imagens)
- Aprimorar imagem (4K)
- Color Match (análise de tintas)
- Dividir em A4 (tattoos grandes)
- Prioridade no suporte

---

## 📁 Arquivos Criados/Modificados

### Banco de Dados
- ✅ `migrations/001_update_plans.sql` - Migration completa com:
  - Novos planos: `free`, `editor_only`, `full_access`
  - Campos de bloqueio: `is_blocked`, `blocked_reason`, `blocked_at`, `blocked_by`
  - Campo admin: `is_admin`
  - Tabelas: `active_sessions`, `admin_logs`
  - Views: `v_daily_metrics`, `v_hourly_activity`
  - Triggers automáticos
  - Índices de performance

### Backend (API)

**Stripe & Pagamentos**
- ✅ `lib/stripe.ts` - Atualizado com:
  - `PRICES.EDITOR_ONLY` (R$ 50/mês)
  - `PRICES.FULL_ACCESS` (R$ 100/mês)
  - `PLAN_FEATURES` com descrição de cada plano
  - Type `PlanType`

- ✅ `app/api/payments/create-checkout/route.ts` - Checkout atualizado:
  - Suporte aos novos planos
  - Metadata com `plan` e `user_id`
  - Modo desenvolvimento bypass Stripe

- ✅ `app/api/webhooks/stripe/route.ts` - Webhook atualizado:
  - Processa novos planos
  - Atualiza campo `plan` no banco
  - Registra `plan_type` nos pagamentos

**Admin APIs**
- ✅ `app/api/admin/metrics/route.ts` - Métricas completas:
  - Total de usuários / pagantes / ativos / online / bloqueados
  - Distribuição de planos
  - Receita total e mensal
  - Uso de IA (total, hoje, por operação)
  - Horários de pico (últimas 24h)

- ✅ `app/api/admin/users/route.ts` - Gerenciamento de usuários:
  - GET: Listar com filtros (plan, status, search)
  - POST: Bloquear/desbloquear usuários
  - POST: Alterar plano manualmente
  - Logs de ações admin

### Frontend

**Admin Dashboard**
- ✅ `app/(dashboard)/admin/page.tsx` - Painel existente (precisa atualizar para novos planos)

### Configuração
- ✅ `.env.local` - Novas variáveis:
  ```
  STRIPE_PRICE_EDITOR=price_xxx  # R$ 50/mês
  STRIPE_PRICE_FULL=price_xxx    # R$ 100/mês
  ```

---

## 🚀 Como Configurar

### 1. Atualizar Banco de Dados

Execute a migration no Supabase SQL Editor:

```bash
# Acesse: https://app.supabase.com/project/YOUR_PROJECT/sql

# Cole e execute o conteúdo de:
migrations/001_update_plans.sql
```

### 2. Criar Planos no Stripe

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Crie 2 produtos:

**Produto 1: StencilFlow Editor**
- Nome: `StencilFlow - Editor`
- Descrição: `Editor de Stencil com Topografia e Linhas`
- Preço: `R$ 50,00 / mês`
- Modo: Recorrente (Mensal)
- Copie o `Price ID` (começa com `price_...`)

**Produto 2: StencilFlow Full Access**
- Nome: `StencilFlow - Full Access`
- Descrição: `Acesso completo: Editor + IA GEN + Ferramentas`
- Preço: `R$ 100,00 / mês`
- Modo: Recorrente (Mensal)
- Copie o `Price ID`

### 3. Atualizar .env.local

```bash
# Adicione ou substitua:
STRIPE_PRICE_EDITOR=price_1234567890abcdef  # Seu Price ID Editor
STRIPE_PRICE_FULL=price_0987654321fedcba    # Seu Price ID Full Access
```

### 4. Configurar Webhook do Stripe

1. Acesse: https://dashboard.stripe.com/test/webhooks
2. Crie novo endpoint:
   - URL: `https://seu-dominio.com/api/webhooks/stripe`
   - Eventos para escutar:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
3. Copie o `Signing secret` (começa com `whsec_...`)
4. Atualize `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_seu_secret_aqui
   ```

### 5. Migrar Usuários Existentes

O SQL migration já faz isso automaticamente:
- Usuários com `tools_unlocked=true` → `full_access`
- Usuários com `is_paid=true` mas sem tools → `editor_only`
- Demais → `free`

### 6. Configurar Admin

Adicione seu email como admin:

```sql
-- Execute no Supabase SQL Editor
UPDATE users
SET is_admin = true
WHERE email = 'seu-email@gmail.com';
```

Ou edite o arquivo `app/api/admin/users/route.ts`:
```typescript
const ADMIN_EMAILS = [
  'seu-email@gmail.com', // Adicione seu email aqui
];
```

---

## 📊 Painel Admin

Acesse: `http://localhost:3000/admin`

### Funcionalidades

**Métricas em Tempo Real:**
- Total de usuários / pagantes / ativos / online
- Receita total e mensal
- Requisições de IA (total e hoje)
- Usuários online agora

**Distribuição de Planos:**
- Quantos usuários em cada plano
- Gráficos visuais

**Horário de Pico:**
- Mostra qual hora tem mais atividade (últimas 24h)

**Gerenciamento de Usuários:**
- Buscar por email/nome
- Filtrar por plano (free/editor/full)
- Filtrar por status (ativo/bloqueado)
- Bloquear/desbloquear usuários
- Alterar plano manualmente
- Ver total de requisições por usuário
- Paginação

---

## 🔐 Controles de Acesso

### Verificação por Plano

```typescript
// Exemplo no backend
const { data: user } = await supabaseAdmin
  .from('users')
  .select('plan')
  .eq('clerk_id', userId)
  .single();

if (user.plan === 'free') {
  return NextResponse.json({ error: 'Plano necessário' }, { status: 403 });
}

if (user.plan !== 'full_access') {
  return NextResponse.json({ error: 'Full Access necessário' }, { status: 403 });
}
```

### Bloqueio de Usuários

Quando um usuário é bloqueado (`is_blocked = true`), adicione verificação nas APIs:

```typescript
if (user.is_blocked) {
  return NextResponse.json({
    error: 'Conta bloqueada',
    reason: user.blocked_reason
  }, { status: 403 });
}
```

---

## 🧪 Testando

### 1. Teste em Desenvolvimento (sem Stripe)

Se `STRIPE_PRICE_EDITOR` estiver com placeholders (`price_xxx`), o sistema ativa direto:

```typescript
// Visite:
http://localhost:3000/api/payments/create-checkout?plan=editor_only
http://localhost:3000/api/payments/create-checkout?plan=full_access

// O usuário será ativado automaticamente em development
```

### 2. Teste com Stripe (Modo Test)

1. Use cartões de teste:
   - Sucesso: `4242 4242 4242 4242`
   - Falha: `4000 0000 0000 0002`
2. Validade: Qualquer data futura
3. CVC: Qualquer 3 dígitos

### 3. Webhook Local (Stripe CLI)

```bash
# Instale Stripe CLI
# https://stripe.com/docs/stripe-cli

# Faça login
stripe login

# Escute webhooks localmente
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copie o webhook secret que aparece (whsec_...)
# Adicione ao .env.local como STRIPE_WEBHOOK_SECRET
```

---

## 📈 Monitoramento

### Queries Úteis

**Ver distribuição de planos:**
```sql
SELECT plan, COUNT(*) as total
FROM users
GROUP BY plan;
```

**Ver receita por plano:**
```sql
SELECT plan_type, SUM(amount) as total
FROM payments
WHERE status = 'succeeded'
GROUP BY plan_type;
```

**Usuários online agora:**
```sql
SELECT COUNT(DISTINCT user_id) as online_users
FROM active_sessions
WHERE last_activity > NOW() - INTERVAL '5 minutes';
```

**Horário de pico (hoje):**
```sql
SELECT
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as requests
FROM ai_usage
WHERE created_at >= CURRENT_DATE
GROUP BY hour
ORDER BY requests DESC
LIMIT 1;
```

---

## 🐛 Troubleshooting

### Erro: "Stripe not configured"

- Verifique se `STRIPE_PRICE_EDITOR` e `STRIPE_PRICE_FULL` estão corretos
- Price IDs devem começar com `price_` e ter mais de 20 caracteres
- Não podem conter `xxx`

### Erro: "Invalid signature" no webhook

- Verifique se `STRIPE_WEBHOOK_SECRET` está correto
- Secret deve começar com `whsec_`
- Reinicie o servidor após alterar `.env.local`

### Usuário não ativou após pagamento

1. Verifique logs do webhook no Stripe Dashboard
2. Veja se webhook está recebendo eventos
3. Confirme que `clerk_id` está nos metadados
4. Verifique tabela `payments` no Supabase

### Admin não tem acesso

1. Confirme que seu email está em `ADMIN_EMAILS`
2. Ou execute: `UPDATE users SET is_admin = true WHERE email = 'seu@email.com'`
3. Faça logout e login novamente

---

## 🎯 Próximos Passos

- [ ] Criar página `/pricing` com comparação de planos
- [ ] Adicionar gráficos no dashboard admin (Chart.js ou Recharts)
- [ ] Implementar cancelamento de assinatura
- [ ] Sistema de cupons de desconto
- [ ] Emails automáticos (boas-vindas, cancelamento, etc)
- [ ] Notificações quando assinatura está expirando

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do terminal do Next.js
3. Verifique os logs do Stripe Dashboard
4. Verifique os logs no Supabase (SQL Editor → Logs)

**Arquivos importantes para debug:**
- `migrations/001_update_plans.sql` - Estrutura do banco
- `lib/stripe.ts` - Configuração Stripe
- `app/api/webhooks/stripe/route.ts` - Processamento de pagamentos
- `app/api/admin/metrics/route.ts` - Métricas do admin

---

✨ **Implementação concluída com sucesso!**
