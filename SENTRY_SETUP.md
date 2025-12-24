# Sentry Setup - Guia Completo
**Data:** 23/12/2025
**Objetivo:** Monitoring de erros e performance em produção

---

## 🎯 O Que o Sentry Faz

### Monitoring de Erros:
- ✅ Captura todos os erros não tratados (client + server)
- ✅ Stack traces completas com source maps
- ✅ Context do erro (browser, OS, user, etc)
- ✅ Alertas em tempo real (email, Slack)

### Performance Monitoring:
- ⚡ Latência de API routes
- ⚡ Tempo de carregamento de páginas
- ⚡ Queries lentas do banco
- ⚡ Chamadas externas (Gemini, Stripe, Supabase)

### Session Replay:
- 📹 Gravação da sessão do usuário antes do erro
- 📹 Ver exatamente o que o usuário fez
- 📹 Reproduzir bugs facilmente

---

## 🔧 Configuração

### 1. Criar Conta no Sentry

1. Acesse: https://sentry.io
2. Crie uma conta gratuita
3. Crie um novo projeto:
   - Plataforma: **Next.js**
   - Nome: `stencilflow`
   - Team: `Personal` (ou crie um time)

### 2. Obter DSN

No dashboard do projeto, copie o **DSN**:
```
https://XXXXXXXXXX@o1234567.ingest.sentry.io/8765432
```

### 3. Configurar Variáveis de Ambiente

Adicione ao `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://XXXXXXXXXX@o1234567.ingest.sentry.io/8765432

# Opcional: Para upload de source maps em produção
SENTRY_AUTH_TOKEN=seu_token_aqui
SENTRY_ORG=sua-organizacao
SENTRY_PROJECT=stencilflow
```

### 4. Deploy

Quando fazer deploy na Vercel/Railway:
1. Adicionar as variáveis de ambiente no painel
2. **IMPORTANTE:** `NEXT_PUBLIC_SENTRY_DSN` precisa do prefixo `NEXT_PUBLIC_` para funcionar no browser

---

## 📊 Como Usar

### 1. Erros Automáticos

Sentry captura automaticamente:
- Erros não tratados em React components
- Erros em API routes
- Erros de rede (fetch failed, timeout)
- Erros em middleware

**Não precisa fazer nada!** ✅

### 2. Captura Manual

Para erros tratados que você quer monitorar:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'stencil-generation',
      userId: user.id,
    },
    extra: {
      style: 'perfect_lines',
      imageSize: '2048x2048',
    },
  });

  // Continuar tratamento normal do erro
  console.error('Erro na geração:', error);
}
```

### 3. Breadcrumbs (Logs)

Para adicionar contexto antes de erros:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.addBreadcrumb({
  category: 'stencil',
  message: 'Iniciando geração de estêncil',
  level: 'info',
  data: {
    style: 'perfect_lines',
    userId: user.id,
  },
});

// Se der erro depois, esse breadcrumb vai aparecer
await generateStencil(image);
```

### 4. Performance Tracking

Para medir operações importantes:

```typescript
import * as Sentry from '@sentry/nextjs';

const transaction = Sentry.startTransaction({
  name: 'Generate Stencil',
  op: 'stencil.generation',
});

try {
  const span = transaction.startChild({
    op: 'gemini.api',
    description: 'Call Gemini API',
  });

  const result = await generateStencilFromImage(image);

  span.finish();
} finally {
  transaction.finish();
}
```

### 5. User Context

Para saber qual usuário teve erro:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.setUser({
  id: user.id,
  email: user.email,
  plan: user.plan,
});

// Agora todos os erros vão incluir esse contexto
```

---

## 🎛️ Configuração Avançada

### Ignorar Erros Conhecidos

Já configurado em `sentry.client.config.ts` e `sentry.server.config.ts`:

```typescript
ignoreErrors: [
  'NetworkError',
  'Failed to fetch',
  'Rate limit exceeded',
  // ... outros
],
```

### Filtrar Dados Sensíveis

Já configurado para remover:
- ❌ Cookies
- ❌ Authorization headers
- ❌ Variáveis de ambiente
- ❌ Dados de console em produção

```typescript
beforeSend(event) {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers['authorization'];
  }
  return event;
}
```

### Sample Rate (Economia)

**Client (Browser):**
- Erros: 100% capturados
- Performance: 10% em produção (economizar cota)
- Session Replay: 10% normais + 100% com erro

**Server (API):**
- Erros: 100% capturados
- Performance: 10% em produção

**Edge (Middleware):**
- Erros: 100% capturados
- Performance: 5% em produção (alto volume)

---

## 📈 Dashboard do Sentry

### Issues (Erros)

O que ver no dashboard:
- **Issues:** Lista de erros únicos agrupados
- **Stack Trace:** Exatamente onde o erro aconteceu
- **Breadcrumbs:** O que o usuário fez antes
- **Tags:** Filtrar por user, section, etc
- **Environment:** development vs production

### Performance

O que monitorar:
- **Transactions:** Tempo de cada endpoint
- **Slow Queries:** APIs que demoram >1s
- **Apdex Score:** Satisfação dos usuários (meta: >0.9)
- **Throughput:** Requests por minuto

### Alertas

Configurar alertas para:
- 🔴 Erro crítico (crash da API)
- 🟡 Performance degradada (latência >3s)
- 🔵 Novo tipo de erro apareceu
- ⚠️ Taxa de erro >5%

**Como configurar:**
1. Sentry Dashboard → Alerts
2. Create Alert Rule
3. Selecionar trigger (ex: "Errors is greater than 10 in 5 minutes")
4. Selecionar notificação (email, Slack)

---

## 💰 Custos

### Free Tier:
- ✅ **5,000 errors/month** (suficiente para começar)
- ✅ **10,000 performance events/month**
- ✅ **Session replay limitado**
- ✅ **30 dias de retenção**
- ✅ **1 membro no time**

### Developer Plan ($26/mês):
- ✅ **50K errors/month** (suficiente para 5K usuários)
- ✅ **100K performance events/month**
- ✅ **Session replay completo**
- ✅ **90 dias de retenção**
- ✅ **Alertas ilimitados**

**Cálculo para 5K usuários:**
- Média: 0.1% taxa de erro = 5K × 0.001 = 5 erros/sessão
- 5K usuários × 5 erros = **25K errors/month**
- **Custo:** Free Tier pode não ser suficiente → **$26/mês**

**ROI:** Sentry economiza **10-20 horas/mês** de debug = economia de $200-400/mês vs custo de $26/mês

---

## 🐛 Troubleshooting

### Sentry não está capturando erros

1. **Verificar DSN:**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   # Deve retornar: https://...
   ```

2. **Verificar build:**
   ```bash
   npm run build
   # Deve aparecer: "Sentry webpack plugin enabled"
   ```

3. **Testar manualmente:**
   ```typescript
   import * as Sentry from '@sentry/nextjs';

   Sentry.captureException(new Error('Test error'));
   ```

### Source maps não funcionam

1. **Verificar token:**
   ```bash
   echo $SENTRY_AUTH_TOKEN
   ```

2. **Gerar token:**
   - Sentry Dashboard → Settings → Auth Tokens
   - Create New Token
   - Permissions: `project:releases`, `project:write`

3. **Adicionar ao .env:**
   ```bash
   SENTRY_AUTH_TOKEN=seu_token
   SENTRY_ORG=sua-org
   SENTRY_PROJECT=stencilflow
   ```

### Performance monitoring lento

Sentry adiciona **~5-10ms** de overhead por request.

**Otimizar:**
- Reduzir `tracesSampleRate` para 0.05 (5%)
- Desabilitar performance em development:
  ```typescript
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  ```

---

## ✅ Checklist de Implementação

### Setup Inicial:
- [x] Instalar @sentry/nextjs
- [x] Criar sentry.client.config.ts
- [x] Criar sentry.server.config.ts
- [x] Criar sentry.edge.config.ts
- [x] Atualizar next.config.js
- [ ] Criar conta no Sentry
- [ ] Adicionar NEXT_PUBLIC_SENTRY_DSN ao .env
- [ ] Testar em development

### Deploy:
- [ ] Adicionar variáveis de ambiente no Vercel/Railway
- [ ] Deploy em produção
- [ ] Verificar erros no dashboard
- [ ] Configurar alertas

### Monitoring:
- [ ] Adicionar user context nas APIs críticas
- [ ] Adicionar breadcrumbs nas operações importantes
- [ ] Testar session replay
- [ ] Configurar alertas para taxa de erro >5%

---

## 📚 Referências

- Documentação oficial: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Dashboard: https://sentry.io
- Performance Best Practices: https://docs.sentry.io/product/performance/

---

**Status:** ✅ **Configurado e pronto para uso**

**Próximo passo:** Criar conta no Sentry e adicionar NEXT_PUBLIC_SENTRY_DSN ao .env
