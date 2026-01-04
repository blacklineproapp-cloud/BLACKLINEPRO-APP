# 📧 Sistema de Remarketing - StencilFlow

Sistema completo de remarketing para converter usuários FREE em pagantes, com identidade visual da marca e rastreamento automático.

---

## ✨ O que foi implementado

### 1. **Email com Identidade Visual StencilFlow**
- ✅ Logo textual estilizado: "StencilFlow"
- ✅ Slogan: "A Arte do Estêncil"
- ✅ Gradiente característico: Emerald (#10b981) → Purple (#a855f7)
- ✅ Design responsivo e profissional
- ✅ Dados 100% reais do projeto (preços, features, social proof)

### 2. **3 Campanhas de Email**

#### **Campanha "initial"** (Dia 1)
- **Assunto:** "A Arte do Estêncil - Desbloqueie o StencilFlow Completo"
- **Foco:** Apresentar recursos premium e benefícios
- **Conteúdo:**
  - Modo Topográfico, Linhas Perfeitas
  - Geração IA, Color Match, Dividir A4
  - Preço: R$ 50/mês (Starter)
  - Social proof: +2.500 tatuadores

#### **Campanha "reminder"** (Dia 7)
- **Assunto:** "48% mais barato que Ghostline - StencilFlow"
- **Foco:** Comparação com concorrentes + urgência
- **Conteúdo:**
  - Tabela comparativa com Ghostline
  - Economia: R$ 47/mês vs concorrente
  - Features exclusivas que eles não têm

#### **Campanha "final"** (Dia 14)
- **Assunto:** "Upload → IA → Download - Simples assim"
- **Foco:** Simplicidade do processo + última chamada
- **Conteúdo:**
  - Processo visual em 3 etapas
  - Stats: 2.500+ tatuadores, 300 DPI, 10-20s
  - Slogan final: "Dê vida às suas ideias"

### 3. **Sistema de Rastreamento**
- ✅ Tabela `remarketing_campaigns` no Supabase
- ✅ Evita envio duplicado (constraint UNIQUE)
- ✅ Rastreia status: sent, failed, bounced, opened, clicked
- ✅ Histórico completo de envios

### 4. **Scripts de Envio**

#### **Manual** (`remarketing`)
- Controle total sobre envios
- Filtros por tipo de campanha, limite, delay
- Modo dry-run para testes

#### **Automatizado** (`remarketing:auto`)
- Executa cronograma completo: Dia 1, 7, 14
- Inteligente: só envia quem ainda não recebeu
- Ideal para Cron Jobs diários

---

## 🚀 Como Usar

### **Passo 1: Setup Inicial**

#### 1.1. Criar tabela de tracking no Supabase

Acesse o **SQL Editor** do Supabase e execute:

```bash
cd stencilflow-nextjs
```

Copie e cole o conteúdo de `scripts/setup-remarketing-table.sql` no SQL Editor.

Ou via CLI (se tiver configurado):
```bash
psql <sua-connection-string> -f scripts/setup-remarketing-table.sql
```

#### 1.2. Verificar variáveis de ambiente

Certifique-se de ter no `.env.local`:

```env
# Resend (Email)
RESEND_API_KEY=re_xxxxxxxxx
FROM_EMAIL=StencilFlow <noreply@stencilflow.com>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App URL
NEXT_PUBLIC_APP_URL=https://stencilflow.com.br
```

---

### **Passo 2: Testar (Dry Run)**

Antes de enviar emails reais, **SEMPRE** teste com dry-run:

```bash
# Testar sistema automatizado
npm run remarketing:auto -- --dry-run

# Testar campanha específica manualmente
npm run remarketing -- --campaign initial --dry-run
```

Isso mostrará:
- Quantos usuários FREE existem
- Quantos já receberam cada campanha
- Quantos receberiam emails (sem enviar de verdade)

---

### **Passo 3: Enviar Campanhas**

#### Opção A: **Sistema Automatizado** (Recomendado)

Executa o cronograma completo automaticamente:

```bash
npm run remarketing:auto
```

**O que ele faz:**
- ✅ Dia 1: Envia "initial" para quem se cadastrou há 1+ dias
- ✅ Dia 7: Envia "reminder" para quem se cadastrou há 7+ dias
- ✅ Dia 14: Envia "final" para quem se cadastrou há 14+ dias
- ✅ Nunca envia duplicado (verifica tabela de tracking)
- ✅ Só envia para usuários FREE (is_paid = false)

#### Opção B: **Envio Manual**

Controle total sobre cada campanha:

```bash
# Enviar campanha inicial para todos FREE
npm run remarketing -- --campaign initial

# Enviar campanha reminder para 10 usuários (teste)
npm run remarketing -- --campaign reminder --limit 10

# Enviar campanha final
npm run remarketing -- --campaign final

# Com delay customizado (2s entre emails)
npm run remarketing -- --campaign initial --delay 2000
```

---

### **Passo 4: Automatizar (Cron Job)**

Para manter o funil ativo, execute diariamente com Cron:

#### No servidor (Linux/Railway/Vercel Cron):

```bash
# Editar crontab
crontab -e

# Adicionar linha (executa todo dia às 9h)
0 9 * * * cd /caminho/para/stencilflow-nextjs && npm run remarketing:auto >> /var/log/remarketing.log 2>&1
```

#### Vercel Cron (vercel.json):

```json
{
  "crons": [
    {
      "path": "/api/cron/remarketing",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Você precisará criar o endpoint:

**`app/api/cron/remarketing/route.ts`**
```typescript
import { automatedRemarketing } from '@/scripts/automated-remarketing';

export async function GET(request: Request) {
  // Verificar secret para segurança
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  await automatedRemarketing({ dryRun: false });
  return Response.json({ success: true });
}
```

---

## 📊 Monitoramento

### Ver campanhas enviadas

```sql
-- Relatório geral
SELECT
  campaign_type,
  COUNT(*) as total,
  COUNT(CASE WHEN email_status = 'sent' THEN 1 END) as enviados,
  COUNT(CASE WHEN email_status = 'failed' THEN 1 END) as falhas
FROM remarketing_campaigns
GROUP BY campaign_type;

-- Usuários que receberam todas as campanhas mas não converteram
SELECT u.email, u.name, u.created_at
FROM users u
WHERE u.is_paid = false
  AND EXISTS (SELECT 1 FROM remarketing_campaigns WHERE user_id = u.id AND campaign_type = 'initial')
  AND EXISTS (SELECT 1 FROM remarketing_campaigns WHERE user_id = u.id AND campaign_type = 'reminder')
  AND EXISTS (SELECT 1 FROM remarketing_campaigns WHERE user_id = u.id AND campaign_type = 'final');
```

### Limpar histórico (cuidado!)

```sql
-- Deletar registros de uma campanha específica (para re-enviar)
DELETE FROM remarketing_campaigns WHERE campaign_type = 'initial';

-- Deletar tudo (CUIDADO - perderá todo o histórico)
DELETE FROM remarketing_campaigns;
```

---

## 🎯 Estratégia de Uso

### Cenário 1: **Primeira Execução**
1. `npm run remarketing:auto -- --dry-run` (verificar quantos receberão)
2. `npm run remarketing:auto` (enviar todas as campanhas elegíveis)
3. Configurar Cron Job para execução diária

### Cenário 2: **Teste com Poucos Usuários**
1. `npm run remarketing -- --campaign initial --limit 5 --dry-run`
2. `npm run remarketing -- --campaign initial --limit 5`
3. Verificar resultados antes de expandir

### Cenário 3: **Re-enviar Campanha**
```sql
-- Limpar registros de uma campanha
DELETE FROM remarketing_campaigns WHERE campaign_type = 'initial';
```
```bash
# Re-enviar
npm run remarketing -- --campaign initial
```

---

## 📈 Métricas Esperadas

Com base em benchmarks de SaaS B2C:

| Métrica | Taxa Esperada |
|---------|---------------|
| **Taxa de Abertura** | 20-30% |
| **Taxa de Clique (CTR)** | 2-5% |
| **Taxa de Conversão** | 0.5-2% |

**Exemplo com 100 usuários FREE:**
- 25 abrem o email
- 3-5 clicam no CTA
- 1-2 convertem em pagantes

---

## 🔧 Troubleshooting

### Emails não estão sendo enviados

1. Verificar `RESEND_API_KEY` no `.env.local`
2. Verificar domínio verificado no Resend
3. Checar logs: erros aparecem no console

### Usuários recebendo emails duplicados

- Verificar se tabela `remarketing_campaigns` foi criada
- Verificar constraint UNIQUE está ativa

### Nenhum usuário elegível

- Verificar se há usuários FREE: `SELECT COUNT(*) FROM users WHERE is_paid = false;`
- Verificar data de cadastro: campanhas só enviam após X dias

---

## 📝 Arquivos Criados

```
stencilflow-nextjs/
├── lib/email/index.ts                        # Templates de email (atualizado)
├── scripts/
│   ├── send-remarketing-emails.ts            # Envio manual
│   ├── automated-remarketing.ts              # Envio automatizado (cronograma)
│   └── setup-remarketing-table.sql           # SQL para criar tabela
├── package.json                              # Novos comandos npm
└── REMARKETING-GUIDE.md                      # Este guia
```

---

## 🎨 Personalização

Para alterar conteúdo dos emails, edite:

**`lib/email/index.ts`**

Procure pela função `sendRemarketingEmail()` e modifique:
- `campaigns.initial` - Campanha Dia 1
- `campaigns.reminder` - Campanha Dia 7
- `campaigns.final` - Campanha Dia 14

Para alterar cores/design:
- Procure por `.header` e altere o gradiente
- Procure por `.button` e altere cores do CTA

---

## ✅ Checklist de Implementação

- [ ] Criar tabela `remarketing_campaigns` no Supabase
- [ ] Configurar `RESEND_API_KEY` no `.env.local`
- [ ] Testar com `--dry-run` primeiro
- [ ] Enviar campanha teste com `--limit 10`
- [ ] Verificar taxa de entrega/abertura
- [ ] Configurar Cron Job para execução diária
- [ ] Monitorar métricas semanalmente

---

## 🚀 Próximos Passos (Opcional)

### Melhorias Futuras:
1. **Segmentação avançada:**
   - Enviar emails diferentes baseado em comportamento
   - Ex: usuário que gerou 0 stencils vs usuário que gerou 5

2. **A/B Testing:**
   - Testar assuntos diferentes
   - Testar CTAs diferentes

3. **Webhooks do Resend:**
   - Rastrear opens/clicks automaticamente
   - Atualizar `email_status` na tabela

4. **Unsubscribe:**
   - Criar página `/unsubscribe`
   - Adicionar coluna `marketing_emails_enabled` na tabela users

---

**Criado para StencilFlow - Sistema de Remarketing Profissional** 🎨
