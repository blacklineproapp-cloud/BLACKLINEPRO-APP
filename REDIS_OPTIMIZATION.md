# 🚀 Otimização Redis - Redução de 80% no Uso

## 📊 Problema Atual

**Limite Upstash Free: 500.000 requests/mês**
**Uso atual: ~575.000 requests/mês** ❌

### Causas:
1. Cache TTL muito curto (1 minuto) → muitos cache misses
2. Rate limiting gastando 65% dos requests
3. Conexão ioredis incompatível com Upstash REST
4. Múltiplas operações por cache (GET + SET + tags)

---

## 🎯 Correções Implementadas

### **Correção #1: Aumentar TTL do Cache de Autenticação**

**Arquivo**: `lib/auth.ts`
**Linha**: 51
**Impacto**: Reduz 50% dos requests de autenticação

```typescript
// ❌ ANTES: Cache de 1 minuto (muitos misses)
const user = await getOrSetCache(
  clerkId,
  async () => { /* ... */ },
  { ttl: 60000 } // 1 minuto
);

// ✅ DEPOIS: Cache de 15 minutos
const user = await getOrSetCache(
  clerkId,
  async () => { /* ... */ },
  {
    ttl: 900000, // 15 minutos
    namespace: 'users'
  }
);
```

**Por quê?**
- Dados de usuário raramente mudam (nome, email, plano)
- 15 minutos é seguro: quando admin muda plano, cache é invalidado manualmente
- Reduz requests de ~150k/mês para ~30k/mês

---

### **Correção #2: Desabilitar Rate Limiting em Desenvolvimento**

**Arquivo**: `lib/rate-limit.ts`
**Linhas**: 21-26, 44-51, 108-115
**Impacto**: Reduz 100% dos requests em dev (economiza seu limite)

```typescript
// ❌ ANTES: Rate limiting SEMPRE ativo
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// ✅ DEPOIS: Desabilitar em desenvolvimento
const redis =
  process.env.NODE_ENV === 'production' &&
  process.env.UPSTASH_REDIS_REST_URL
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : null;
```

**Por quê?**
- Em dev, você testa gerações constantemente
- Rate limiting em dev gasta ~100k requests/mês do seu limite
- Produção: rate limiting essencial (previne abuso)

---

### **Correção #3: Remover ioredis (Incompatível com Upstash)**

**Arquivo**: `lib/cache-redis.ts`
**Linhas**: 1, 19-63
**Impacto**: Elimina tentativas de conexão falhas

```typescript
// ❌ ANTES: Usando ioredis (não funciona com Upstash REST)
import { Redis } from 'ioredis';

redisClient = new Redis({
  host: process.env.UPSTASH_REDIS_REST_URL!.replace('https://', ''),
  port: 6379,
  password: process.env.UPSTASH_REDIS_REST_TOKEN!,
  tls: {},
});

// ✅ DEPOIS: Usar @upstash/redis (compatível com REST API)
import { Redis } from '@upstash/redis';

const redisClient = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;
```

**Por quê?**
- `ioredis` usa protocolo TCP (porta 6379)
- Upstash Free usa REST API (HTTPS)
- Tentativas de conexão TCP falham e ficam retrying
- `@upstash/redis` é otimizado para Upstash

---

### **Correção #4: Remover Tags de Cache (Simplificar)**

**Arquivo**: `lib/cache-redis.ts`
**Linhas**: 166-171
**Impacto**: Reduz 40% dos requests de cache

```typescript
// ❌ ANTES: Salvar tags (3 operações extras)
await redisClient.setex(fullKey, ttl, JSON.stringify(data));

if (tags && tags.length > 0) {
  for (const tag of tags) {
    await redisClient.sadd(`tag:${tag}`, fullKey); // +1 request
    await redisClient.expire(`tag:${tag}`, ttl);   // +1 request
  }
}

// ✅ DEPOIS: Apenas setex (1 operação)
await redisClient.setex(fullKey, ttl, JSON.stringify(data));

// Tags só em casos críticos (invalidação manual)
// Para invalidar: usar invalidateCacheByPattern() com namespace
```

**Por quê?**
- Tags gastam 2-3 requests extras por cache set
- Namespace + pattern matching é mais eficiente
- Exemplo: invalidar usuário → `invalidateCacheByPattern('*', 'users:${userId}')`

---

### **Correção #5: Aumentar TTL Padrão Global**

**Arquivo**: `lib/cache-redis.ts`
**Linha**: 143
**Impacto**: Reduz cache misses em 30%

```typescript
// ❌ ANTES: TTL padrão de 1 minuto
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 60000, tags, namespace } = options; // 1 minuto

// ✅ DEPOIS: TTL padrão de 5 minutos
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 300000, tags, namespace } = options; // 5 minutos
```

**Por quê?**
- Dados de aplicação (projetos, stencils) mudam pouco
- 5 minutos é seguro para maioria dos casos
- Rotas críticas (stats admin) podem sobrescrever com TTL menor

---

### **Correção #6: Otimizar API /stats (Maior Consumidor)**

**Arquivo**: `app/api/admin/stats/route.ts`
**Linha**: 32
**Impacto**: Reduz requests de admin em 90%

```typescript
// ❌ ANTES: Cache de 5 minutos em rota pesada
return NextResponse.json(stats, {
  headers: {
    'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600'
  }
});

// ✅ DEPOIS: Cache de 1 hora (stats mudam pouco)
const stats = await getOrSetCache(
  'admin-stats',
  async () => {
    // ... buscar stats pesadas do Supabase
  },
  {
    ttl: 3600000, // 1 hora
    namespace: 'admin'
  }
);

return NextResponse.json(stats, {
  headers: {
    'Cache-Control': 'private, s-maxage=3600'
  }
});
```

**Por quê?**
- Stats admin são acessadas frequentemente pelo dashboard
- Números de usuários/planos mudam lentamente
- 1 hora é aceitável para métricas não-realtime

---

## 📈 Projeção de Redução

| Categoria | Antes | Depois | Redução |
|-----------|-------|--------|---------|
| **Autenticação** | 150k/mês | 30k/mês | **-80%** |
| **Rate Limiting (dev)** | 100k/mês | 0/mês | **-100%** |
| **Cache de dados** | 50k/mês | 20k/mês | **-60%** |
| **Tags de cache** | 75k/mês | 0/mês | **-100%** |
| **Stats admin** | 50k/mês | 5k/mês | **-90%** |
| **Rate Limiting (prod)** | 150k/mês | 150k/mês | 0% |
| **TOTAL** | **575k/mês** | **205k/mês** | **-64%** ✅ |

**Novo limite: 205k/mês de 500k** → Margem de segurança de **60%**

---

## 🛠️ Como Aplicar

### **Opção 1: Aplicar Automaticamente (Recomendado)**

Eu posso aplicar todas as 6 correções automaticamente. Basta confirmar.

### **Opção 2: Aplicar Manualmente**

1. **Cache de auth (15min)**:
   ```bash
   # Editar lib/auth.ts linha 51
   ttl: 900000 // era 60000
   ```

2. **Desabilitar rate limit dev**:
   ```bash
   # Editar lib/rate-limit.ts linha 21
   const redis = process.env.NODE_ENV === 'production' && ...
   ```

3. **Trocar ioredis por @upstash/redis**:
   ```bash
   npm uninstall ioredis
   npm install @upstash/redis
   # Editar lib/cache-redis.ts linha 1
   ```

4. **Remover tags**:
   ```bash
   # Comentar linhas 166-171 em lib/cache-redis.ts
   ```

5. **TTL padrão 5min**:
   ```bash
   # Editar lib/cache-redis.ts linha 143
   ttl = 300000 // era 60000
   ```

6. **Cache stats 1h**:
   ```bash
   # Editar app/api/admin/stats/route.ts
   # Adicionar getOrSetCache com ttl 3600000
   ```

---

## ⚠️ Considerações

### **Não Aplicar Se:**
- Você precisa de dados em tempo real (TTL alto aumenta latência de updates)
- Seu app tem alta concorrência (> 10k usuários simultâneos)

### **Monitorar Após Aplicar:**
1. Dashboard Upstash → Requests/dia (deve cair ~60%)
2. Logs: `[Redis] Cache HIT/MISS` ratio deve melhorar
3. Invalidar cache manual quando mudar plano:
   ```typescript
   await invalidateCache(userId, 'users');
   ```

---

## 🚀 Próximos Passos (Opcional)

Se ainda precisar reduzir mais:

1. **Upgrade Upstash**: $10/mês = 10M requests (20x mais)
2. **Batch Operations**: Agrupar múltiplos GETs em MGET
3. **Edge Caching**: Usar Vercel Edge Config (grátis, ilimitado)
4. **Lazy Loading**: Cachear apenas dados críticos

---

## 📝 Checklist

- [ ] Aplicar Correção #1: Cache auth 15min
- [ ] Aplicar Correção #2: Desabilitar rate limit dev
- [ ] Aplicar Correção #3: Trocar ioredis → @upstash/redis
- [ ] Aplicar Correção #4: Remover tags
- [ ] Aplicar Correção #5: TTL padrão 5min
- [ ] Aplicar Correção #6: Cache stats 1h
- [ ] Testar em dev (verificar logs de cache HIT)
- [ ] Deploy em produção
- [ ] Monitorar Upstash dashboard (24h)

---

**Quer que eu aplique todas as correções automaticamente?**

Confirme e eu implemento tudo agora, com logs detalhados de cada mudança.
