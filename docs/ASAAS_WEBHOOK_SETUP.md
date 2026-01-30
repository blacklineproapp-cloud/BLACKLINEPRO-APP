# Configuração do Webhook Asaas

## 📋 Pré-requisitos

- [x] Integração Asaas testada e funcionando
- [x] Rota de webhook implementada: `/api/webhooks/asaas`
- [ ] Token de autenticação configurado
- [ ] ngrok rodando (para testes locais)

## 🔐 Passo 1: Configurar Token de Autenticação

Adicione a variável de ambiente no `.env.local`:

```bash
# Token para validar webhooks do Asaas (gere um token seguro)
ASAAS_WEBHOOK_TOKEN=seu_token_secreto_aqui
```

**Gerar token seguro:**
```bash
# No terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🌐 Passo 2: Configurar Webhook no Painel Asaas

### URL do Webhook

**Desenvolvimento (ngrok):**
```
https://34a940e87ff2.ngrok-free.app/api/webhooks/asaas
```

**Produção:**
```
https://seu-dominio.com/api/webhooks/asaas
```

### Configuração no Painel

1. Acesse: https://sandbox.asaas.com/config/webhooks (sandbox) ou https://www.asaas.com/config/webhooks (produção)

2. Clique em **"Adicionar Webhook"**

3. Preencha os campos:
   - **URL**: Cole a URL do webhook (ngrok ou produção)
   - **Token de Autenticação**: Cole o valor de `ASAAS_WEBHOOK_TOKEN`
   - **Versão da API**: Selecione a versão mais recente (v3)

4. Selecione os eventos que deseja receber:

#### ✅ Eventos de Pagamento (obrigatórios)
- [x] `PAYMENT_CREATED` - Cobrança criada
- [x] `PAYMENT_RECEIVED` - Pagamento recebido (PIX/Boleto)
- [x] `PAYMENT_CONFIRMED` - Pagamento confirmado (Cartão)
- [x] `PAYMENT_OVERDUE` - Pagamento vencido
- [x] `PAYMENT_REFUNDED` - Pagamento estornado
- [x] `PAYMENT_DELETED` - Cobrança removida
- [x] `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` - Cartão recusado

#### ✅ Eventos de Assinatura (obrigatórios)
- [x] `SUBSCRIPTION_CREATED` - Assinatura criada
- [x] `SUBSCRIPTION_UPDATED` - Assinatura atualizada
- [x] `SUBSCRIPTION_DELETED` - Assinatura cancelada
- [x] `SUBSCRIPTION_INACTIVATED` - Assinatura inativada

5. Clique em **"Salvar"**

## 🧪 Passo 3: Testar Webhook

### 3.1. Verificar ngrok está rodando

```bash
ngrok http 3000
```

Copie a URL gerada (ex: `https://34a940e87ff2.ngrok-free.app`)

### 3.2. Criar cobrança de teste

Execute o script de teste novamente:

```bash
npx tsx scripts/test-asaas-integration.ts
```

### 3.3. Simular pagamento no painel Asaas

1. Acesse: https://sandbox.asaas.com/payments
2. Encontre a cobrança criada pelo teste
3. Clique em **"Ações"** → **"Simular Pagamento"**
4. Confirme a simulação

### 3.4. Verificar logs

**No terminal do seu app:**
```
[Asaas Webhook] Evento recebido: PAYMENT_RECEIVED
[Asaas Webhook] 💰 Pagamento recebido: pay_xxx - R$ 5.00
[Asaas Webhook] ✅ Usuário ativado: ...
[Asaas Webhook] ✅ Evento processado: PAYMENT_RECEIVED
```

**No painel ngrok (http://127.0.0.1:4040):**
- Deve aparecer um POST com status **200 OK**
- Se aparecer **403 Forbidden**, verifique o token
- Se aparecer **500**, verifique os logs do servidor

## 🔍 Passo 4: Validar Processamento

### Verificar no banco de dados

```sql
-- Verificar eventos processados
SELECT * FROM webhook_events 
WHERE source = 'asaas' 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar pagamentos salvos
SELECT * FROM payments 
WHERE asaas_payment_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar usuário ativado
SELECT id, email, plan, is_paid, subscription_status, tools_unlocked
FROM users 
WHERE asaas_customer_id IS NOT NULL;
```

## ⚠️ Troubleshooting

### 403 Forbidden
- **Causa**: Token de autenticação inválido
- **Solução**: Verifique se `ASAAS_WEBHOOK_TOKEN` está configurado corretamente no `.env.local` e no painel Asaas

### 500 Internal Server Error
- **Causa**: Erro no processamento do evento
- **Solução**: Verifique os logs do servidor para detalhes do erro

### Webhook não recebe eventos
- **Causa**: URL incorreta ou ngrok não está rodando
- **Solução**: 
  1. Verifique se o ngrok está ativo
  2. Confirme que a URL no painel Asaas está correta
  3. Teste manualmente: `curl -X POST https://sua-url/api/webhooks/asaas -H "asaas-access-token: seu_token"`

### Eventos duplicados
- **Causa**: Asaas reenvia eventos se não receber 200 OK
- **Solução**: A rota já tem proteção de idempotência via `webhook_events` table

## 📊 Eventos Processados

A rota de webhook processa os seguintes eventos:

| Evento | Ação |
|--------|------|
| `PAYMENT_RECEIVED` | Ativa usuário, desbloqueia ferramentas, limpa grace period |
| `PAYMENT_CONFIRMED` | Ativa usuário (cartão de crédito) |
| `PAYMENT_CREATED` | Salva cobrança como pendente |
| `PAYMENT_OVERDUE` | Inicia grace period de 3 dias |
| `PAYMENT_REFUNDED` | Desativa usuário se não tiver outros pagamentos |
| `SUBSCRIPTION_CREATED` | Salva assinatura no banco |
| `SUBSCRIPTION_UPDATED` | Sincroniza status da assinatura |
| `SUBSCRIPTION_DELETED` | Desativa usuário, cancela assinatura |

## ✅ Checklist Final

- [ ] Token de autenticação configurado no `.env.local`
- [ ] Webhook configurado no painel Asaas (sandbox)
- [ ] ngrok rodando e URL atualizada no painel
- [ ] Teste de pagamento simulado com sucesso
- [ ] Logs confirmam recebimento e processamento
- [ ] Banco de dados atualizado corretamente
- [ ] Webhook configurado em produção (quando pronto)

## 🚀 Próximos Passos

1. ✅ Webhook configurado e testado
2. [ ] Executar migração de usuários do Stripe para Asaas
3. [ ] Configurar emails de notificação (pagamento vencido, confirmado, etc.)
4. [ ] Implementar dashboard de pagamentos Asaas no admin
5. [ ] Configurar webhook em produção
