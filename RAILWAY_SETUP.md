# 🚂 Railway Workers - Guia Rápido

## 🎯 O que são os Workers?

Os workers processam jobs em background (filas BullMQ):
- **Stencil Generation** - Geração de stencils (5 concurrent)
- **Image Enhancement** - Upscale 4K (3 concurrent)
- **AI Generation** - Geração de ideias (3 concurrent)
- **Color Matching** - Análise de cores (10 concurrent)

---

## 🚀 Setup no Railway

### 1. Criar Projeto

1. Acesse: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Selecione o repositório

### 2. Configurar Variáveis de Ambiente

**Railway Dashboard → Variables → Raw Editor**

Cole isto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxx
GEMINI_API_KEY=AIzaxxx
CLERK_SECRET_KEY=sk_xxx
NODE_ENV=production
```

### 3. Deploy

Railway vai detectar automaticamente:
- `railway.json` com configurações
- `Procfile` com comando de start
- `package.json` com script `worker`

**Start command:** `npm run worker`

---

## ✅ Verificar que está Funcionando

### Logs devem mostrar:

```
🚀 Starting Railway Workers...
Environment: production

Configuration Check:
  Redis URL: ✅ Configured
  Redis Token: ✅ Configured
  Supabase URL: ✅ Configured
  Supabase Service Key: ✅ Configured
  Gemini API Key: ✅ Configured
  Clerk Secret: ✅ Configured

✅ Workers started successfully!

Workers running:
  - Stencil Generation (concurrency: 5)
  - Image Enhancement (concurrency: 3)
  - AI Generation (concurrency: 3)
  - Color Matching (concurrency: 10)
```

### Testar Processamento

1. Abra o app no navegador
2. Gere um stencil no editor
3. Observe os logs do Railway
4. Deve aparecer:
   ```
   [Worker] Processando job stencil-xxx para user user_xxx
   [Worker] Job stencil-xxx concluído com sucesso
   ```

---

## 🔧 Comandos Úteis

### Restart Workers
```
Railway Dashboard → Deployments → Restart
```

### Ver Logs em Tempo Real
```
Railway Dashboard → Deployments → View Logs
```

### Verificar Uso de Recursos
```
Railway Dashboard → Metrics
```

---

## 💰 Custos

**Railway Hobby Plan:**
- $5/mês (500 horas)
- Workers 24/7 = ~720 horas/mês
- **Custo real:** ~$5-10/mês

**Railway Pro Plan:**
- $20/mês (mais recursos)
- Melhor para produção com alto volume

---

## 🐛 Troubleshooting

### Workers não iniciam

**Erro:** `Missing required environment variables`

**Solução:** Verificar se TODAS as variáveis estão configuradas no Railway

---

### Jobs não processam

**Erro:** `Cannot connect to Redis`

**Solução:**
1. Verificar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
2. Testar conexão no Upstash Console

---

### Jobs ficam travados em "active"

**Causa:** Worker crashou durante processamento

**Solução:**
1. Restart workers no Railway
2. Limpar fila manualmente (Upstash Redis CLI):
   ```
   DEL bull:stencil-generation:active
   ```

---

## 📊 Monitoramento

### Railway Metrics
- CPU Usage
- Memory Usage
- Network

### Upstash Console
- Comandos úteis:
  ```bash
  LLEN bull:stencil-generation:waiting  # Jobs aguardando
  LLEN bull:stencil-generation:active   # Jobs processando
  LLEN bull:stencil-generation:completed # Jobs completados
  LLEN bull:stencil-generation:failed   # Jobs falhados
  ```

---

## ✅ Checklist

- [ ] Projeto criado no Railway
- [ ] Repositório conectado
- [ ] Variáveis de ambiente configuradas (6 obrigatórias)
- [ ] Deploy funcionando
- [ ] Logs mostram "Workers started successfully"
- [ ] Teste de geração de stencil funciona
- [ ] Workers processam jobs em tempo real

---

**Pronto! Workers rodando em produção.** 🚀
