# Sistema de Filas - Setup Completo
**Data:** 23/12/2025
**Objetivo:** Escalar para 5.000 usuários com processamento assíncrono

---

## 🎯 O Que Resolve

### Problema Atual (Síncrono):
```
Usuário clica "Gerar"
    ↓
API bloqueia por 5-8s (Gemini processando)
    ↓
Timeout se >10s
    ↓
UX ruim, limite ~25 usuários simultâneos
```

### Solução (Assíncrono com Fila):
```
Usuário clica "Gerar"
    ↓
API responde IMEDIATAMENTE com job_id (< 100ms)
    ↓
Worker processa em background
    ↓
Frontend busca status a cada 2s
    ↓
Mostra "Processando..." → "Concluído!"
    ↓
Aguenta 500+ usuários simultâneos
```

---

## 📦 Dependências Instaladas

```bash
npm install bullmq ioredis --legacy-peer-deps
```

✅ **Status:** Instalado

---

## 🗂️ Arquitetura Criada

### 1. **lib/queue.ts** - Sistema de Filas
- 4 filas: `stencil-generation`, `enhance`, `ia-gen`, `color-match`
- Funções para adicionar jobs: `addStencilJob()`, `addEnhanceJob()`, etc.
- Funções para consultar status: `getJobStatus()`, `getUserJobs()`
- Estatísticas: `getQueueStats()`

### 2. **lib/queue-worker.ts** - Workers
- 4 workers que processam jobs em background
- Concorrência configurada por tipo:
  - Stencil: 5 jobs paralelos
  - Enhance: 3 jobs paralelos
  - IA Gen: 3 jobs paralelos
  - Color Match: 10 jobs paralelos

### 3. **app/api/queue/status/[jobId]/route.ts**
- API para frontend buscar status do job
- `GET /api/queue/status/job-123?queue=stencil-generation`

---

## 🔧 Setup Redis

### Opção 1: Usar Upstash (Mesmo do Rate Limiting)
**Recomendado** - Usa o Redis que você já vai configurar para rate limiting

Não precisa fazer nada extra, apenas configurar:
```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Opção 2: Redis Separado
Se quiser separar rate limiting de filas:

**Railway.app (Recomendado):**
1. Acesse: https://railway.app/
2. Crie novo projeto → Add Redis
3. Copie credenciais:

```env
REDIS_HOST=xxxx.railway.app
REDIS_PORT=6379
REDIS_PASSWORD=xxxxxxx
```

**Upstash Redis Dedicado:**
```env
QUEUE_REDIS_URL=https://...
QUEUE_REDIS_TOKEN=...
```

---

## 🚀 Como Iniciar Workers

### Desenvolvimento Local

**Opção 1: Via npm script**
Adicione em `package.json`:
```json
{
  "scripts": {
    "worker": "tsx lib/queue-worker.ts"
  }
}
```

Execute em terminal separado:
```bash
npm run worker
```

**Opção 2: Via arquivo standalone**
Crie `scripts/start-workers.ts`:
```typescript
import { startAllWorkers } from '../lib/queue-worker';

startAllWorkers();
console.log('✅ Workers iniciados!');

// Manter processo vivo
process.stdin.resume();
```

Execute:
```bash
tsx scripts/start-workers.ts
```

### Produção (Vercel)

**IMPORTANTE:** Vercel Functions têm timeout de 10s no Hobby, 60s no Pro.

**Solução:** Usar **Background Functions** (Beta do Vercel)

Ou rodar workers em serviço separado:

#### Opção A: Railway.app
1. Criar novo serviço no Railway
2. Apontar para o mesmo repo
3. Configurar comando: `npm run worker`
4. Mesmas variáveis de ambiente

**Custo:** $5/mês (500h de compute)

#### Opção B: Render.com
1. Criar "Background Worker"
2. Comando: `npm run worker`
3. Tipo: Worker (não Web Service)

**Custo:** $7/mês (FREE para teste)

#### Opção C: Vercel Cron + Edge Functions
Não usar workers persistentes, mas Cron que processa fila a cada 1 minuto.

**Limitação:** Menos responsivo (delay de até 1min)

---

## 📝 Como Usar nas APIs

### Exemplo: Geração Assíncrona

**Arquivo:** `app/api/stencil/generate-async/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { addStencilJob } from '@/lib/queue';
import { canUseOperation } from '@/lib/credits';

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Verificar créditos ANTES de adicionar à fila
  const canUse = await canUseOperation(userId, 'topographic');
  if (!canUse.allowed) {
    return NextResponse.json({ error: canUse.reason }, { status: 403 });
  }

  const { image, style, promptDetails } = await req.json();

  // Adicionar job à fila
  const job = await addStencilJob({
    userId,
    image,
    style: style || 'standard',
    promptDetails,
    operationType: 'topographic',
  });

  // Retornar IMEDIATAMENTE com job_id
  return NextResponse.json({
    success: true,
    jobId: job.id,
    message: 'Stencil sendo gerado em background',
  });
}
```

### Frontend: Polling de Status

```typescript
async function generateStencil(image: string) {
  // 1. Enviar para fila
  const response = await fetch('/api/stencil/generate-async', {
    method: 'POST',
    body: JSON.stringify({ image, style: 'standard' }),
  });

  const { jobId } = await response.json();

  // 2. Polling de status (a cada 2s)
  const checkStatus = async () => {
    const statusResponse = await fetch(
      `/api/queue/status/${jobId}?queue=stencil-generation`
    );
    const status = await statusResponse.json();

    if (status.status === 'completed') {
      console.log('✅ Concluído!', status.result);
      return status.result.image;
    }

    if (status.status === 'failed') {
      console.error('❌ Falhou:', status.error);
      throw new Error(status.error);
    }

    // Ainda processando
    console.log(`⏳ ${status.progress}%`);
    setTimeout(checkStatus, 2000); // Tentar novamente em 2s
  };

  await checkStatus();
}
```

---

## 🎨 UI de Status em Tempo Real

### Componente de Progresso

```tsx
'use client';

import { useEffect, useState } from 'react';

interface JobStatusProps {
  jobId: string;
  queueName: string;
  onComplete: (result: any) => void;
}

export function JobStatus({ jobId, queueName, onComplete }: JobStatusProps) {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/queue/status/${jobId}?queue=${queueName}`);
      const data = await res.json();

      setStatus(data);

      if (data.status === 'completed') {
        clearInterval(interval);
        onComplete(data.result);
      }

      if (data.status === 'failed') {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, queueName]);

  if (!status) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      {status.status === 'waiting' && (
        <div className="flex items-center gap-2">
          <div className="animate-spin">⏳</div>
          <span>Na fila...</span>
        </div>
      )}

      {status.status === 'active' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="animate-spin">🎨</div>
            <span>Gerando stencil...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${status.progress || 0}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{status.progress}%</span>
        </div>
      )}

      {status.status === 'completed' && (
        <div className="text-emerald-600 font-semibold">
          ✅ Concluído!
        </div>
      )}

      {status.status === 'failed' && (
        <div className="text-red-600">
          ❌ Erro: {status.error}
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Monitoramento de Filas

### API de Estatísticas

Criar `app/api/admin/queue-stats/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getQueueStats } from '@/lib/queue';

export async function GET() {
  const { userId } = await auth();

  // Verificar se é admin (implementar)
  // if (!isAdmin(userId)) return NextResponse.json({}, { status: 403 });

  const [stencilStats, enhanceStats, iaGenStats] = await Promise.all([
    getQueueStats('stencil-generation'),
    getQueueStats('enhance'),
    getQueueStats('ia-gen'),
  ]);

  return NextResponse.json({
    stencil: stencilStats,
    enhance: enhanceStats,
    iaGen: iaGenStats,
  });
}
```

### Dashboard Admin

```tsx
function QueueDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/admin/queue-stats');
      const data = await res.json();
      setStats(data);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Atualizar a cada 5s

    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div>Carregando...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="border p-4 rounded">
        <h3 className="font-bold">Stencil Generation</h3>
        <p>Aguardando: {stats.stencil.waiting}</p>
        <p>Processando: {stats.stencil.active}</p>
        <p>Completados: {stats.stencil.completed}</p>
        <p>Falhados: {stats.stencil.failed}</p>
      </div>

      {/* Repetir para enhance e iaGen */}
    </div>
  );
}
```

---

## 🎯 Benefícios do Sistema de Filas

### Performance:
- ⚡ **API responde em <100ms** (vs 5-8s antes)
- 🚀 **500+ usuários simultâneos** (vs ~25 antes)
- 🔄 **Retry automático** em falhas
- 📊 **Processamento paralelo** (5-10 jobs simultâneos)

### UX:
- ✅ **Não bloqueia usuário** durante geração
- 📈 **Barra de progresso** em tempo real
- 🎨 **Múltiplas gerações** ao mesmo tempo
- ⏱️ **Timeout handling** melhor

### Escalabilidade:
- 📦 **Workers independentes** (pode escalar separadamente)
- 🔍 **Monitoramento** de filas
- 💾 **Histórico** de jobs
- 🧹 **Limpeza automática** de jobs antigos

---

## 💰 Custo Estimado

### Redis (Upstash):
- Free Tier: 10K comandos/dia = **$0**
- Pago: $0.20 por 100K comandos

### Workers (Railway):
- 500h de compute/mês = **$5/mês**
- Suficiente para 5K usuários

### Total para 5K usuários:
- Redis: $0-10/mês
- Workers: $5/mês
- **Total: ~$5-15/mês** 🎯

---

## ✅ Checklist de Implementação

### Setup Inicial:
- [x] Instalar BullMQ + ioredis
- [x] Criar lib/queue.ts
- [x] Criar lib/queue-worker.ts
- [x] Criar API de status

### Configuração:
- [ ] Configurar Redis (Upstash ou Railway)
- [ ] Adicionar variáveis de ambiente
- [ ] Testar workers localmente
- [ ] Criar API assíncrona de geração

### Frontend:
- [ ] Implementar polling de status
- [ ] Criar componente de progresso
- [ ] Testar fluxo completo

### Produção:
- [ ] Deploy workers no Railway/Render
- [ ] Configurar mesmas env vars
- [ ] Testar em produção
- [ ] Monitorar performance

### Monitoramento:
- [ ] Dashboard de filas no admin
- [ ] Alertas de filas cheias
- [ ] Logs estruturados

---

## 🚨 Troubleshooting

### Workers não processam jobs:
```bash
# Verificar se Redis está acessível
redis-cli -h <host> -p <port> -a <password> ping
# Deve retornar: PONG
```

### Jobs ficam stuck em "waiting":
- Workers não estão rodando
- Verificar logs dos workers
- Reiniciar workers

### Jobs falham sempre:
- Verificar logs do worker
- Verificar se Gemini API key está correta
- Verificar rate limiting

### Performance lenta:
- Aumentar concurrency dos workers
- Adicionar mais workers (horizontal scaling)
- Usar Redis mais potente

---

## 📚 Referências

- BullMQ Docs: https://docs.bullmq.io/
- Redis (ioredis): https://github.com/redis/ioredis
- Railway Deploy: https://railway.app/docs
- Vercel Background Functions: https://vercel.com/docs/functions/background-functions

---

**Próximo passo:** Configurar Redis e testar sistema completo!
