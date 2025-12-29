# 🔐 MELHORIAS DE SEGURANÇA E QUALIDADE - STENCILFLOW

**Data:** 2025-12-28
**Status:** ✅ Semana 1, Dia 1-2 CONCLUÍDO (3/21 tarefas)

---

## 📊 PROGRESSO GERAL

- **Concluído:** 3/21 tarefas (14%)
- **Em andamento:** 1 tarefa (Acessibilidade)
- **Pendente:** 17 tarefas

### Score Atual vs Meta
| Categoria | Score Antes | Score Meta | Status |
|-----------|-------------|------------|--------|
| Segurança | 7.2/10 | 9.5/10 | 🟡 Em progresso |
| Acessibilidade | 3.0/10 | 9.0/10 | 🔴 Próxima prioridade |
| Performance | 7.0/10 | 9.0/10 | ⏸️ Aguardando |
| Arquitetura | 7.5/10 | 8.5/10 | ⏸️ Aguardando |

---

## ✅ CONCLUÍDO - Semana 1, Dia 1-2: Segurança

### 1. Vulnerabilidade SSRF Corrigida ✅

**Arquivo:** `app/api/proxy-image/route.ts`

**Mudanças:**
```typescript
// ✅ ANTES (VULNERÁVEL):
export async function POST(req: Request) {
  const { url } = await req.json();
  const response = await fetch(url); // ⚠️ SSRF!
}

// ✅ DEPOIS (SEGURO):
export async function POST(req: Request) {
  // 1. Autenticação obrigatória
  const { userId } = await auth();
  if (!userId) return 401;

  // 2. Rate limiting (60/min)
  const rateLimit = await apiLimiter.limit(userId);
  if (!rateLimit.success) return 429;

  // 3. Whitelist de domínios
  const ALLOWED_DOMAINS = [
    'storage.googleapis.com',
    'img.clerk.com',
    'imagedelivery.net',
    // ... outros domínios confiáveis
  ];

  if (!isAllowedDomain(url)) return 403;

  // 4. Validação de content-type
  if (!contentType.startsWith('image/')) return 400;

  // 5. Limite de tamanho (10MB)
  if (size > 10MB) return 413;

  // 6. Timeout (10s)
  fetch(url, { signal: AbortSignal.timeout(10000) });
}
```

**Impacto:**
- ✅ SSRF bloqueado
- ✅ Rate limiting implementado
- ✅ Validação em 6 camadas

---

### 2. Admin Emails Migrados para Database ✅

**Problema:** Hard-coded admin emails em 17+ arquivos

**Solução:**

#### A. Migration Criada
**Arquivo:** `supabase/migrations/004_create_admin_users.sql`

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('admin', 'superadmin')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### B. Helper Functions
**Arquivo:** `lib/auth.ts` (adicionado)

```typescript
// Verifica se é admin (cache de 5 min)
export async function isAdmin(userId: string): Promise<boolean>

// Verifica se é superadmin
export async function isSuperAdmin(userId: string): Promise<boolean>

// Requer admin ou lança erro
export async function requireAdmin(userId: string): Promise<void>

// Requer superadmin ou lança erro
export async function requireSuperAdmin(userId: string): Promise<void>
```

#### C. Arquivos Migrados (17 total)
**Script:** `scripts/migrate-admin-emails.js`

```
✅ app/api/stencil/generate/route.ts
✅ app/api/tools/split-a4/route.ts
✅ app/api/tools/enhance/route.ts
✅ app/api/tools/color-match/route.ts
✅ app/api/admin/setup-payment/route.ts
✅ app/api/admin/activate-user/route.ts
✅ app/api/admin/activate-with-grace/route.ts
✅ app/api/admin/fix-my-account/route.ts
✅ app/api/admin/delete-user/route.ts
✅ app/api/admin/merge-users/route.ts
✅ app/api/admin/cleanup-duplicates/route.ts
✅ app/api/admin/users/route.ts
✅ lib/credits.ts
✅ app/api/debug/user/route.ts
✅ app/api/admin/migrate-users/route.ts
✅ app/api/admin/stats/route.ts
✅ app/api/admin/metrics/route.ts
```

**Exemplo de mudança:**
```typescript
// ❌ ANTES
const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];
const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === userEmail);

// ✅ DEPOIS
import { isAdmin as checkIsAdmin } from '@/lib/auth';
const userIsAdmin = await checkIsAdmin(userId);
```

**Impacto:**
- ✅ Segurança: Admins não mais hardcoded
- ✅ Flexibilidade: Adicionar/remover admins sem deploy
- ✅ Auditoria: Quem concedeu, quando expira
- ✅ Performance: Cache de 5 minutos

---

### 3. Rate Limiting em Tools APIs ✅

**Rotas Protegidas:**
- `POST /api/tools/split-a4` → 60 requests/min
- `POST /api/tools/enhance` → 60 requests/min
- `POST /api/tools/color-match` → 60 requests/min

**Implementação:**
```typescript
import { apiLimiter, getRateLimitIdentifier } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const { userId } = await auth();

  // Rate limiting
  const identifier = await getRateLimitIdentifier(userId);
  const { success, limit, remaining, reset } = await apiLimiter.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Muitas requisições', limit, remaining, reset },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );
  }

  // Processar request...
}
```

**Impacto:**
- ✅ Proteção contra abuso
- ✅ Headers de rate limit (RFC 6585)
- ✅ 60 requests/minuto por usuário

---

## 🔄 EM ANDAMENTO - Semana 1, Dia 3-5: Acessibilidade

### 4. ARIA Labels em Botões com Ícones 🔄

**Status:** Identificados 16 componentes com 50+ botões sem aria-label

**Componentes Pendentes:**
- [ ] ImageCropControl.tsx (10 botões)
- [ ] ProjectCard.tsx (2 botões)
- [ ] ProfessionalControls.tsx
- [ ] StencilAdjustControls.tsx
- [ ] CheckoutModal.tsx
- [ ] AddCardModal.tsx
- [ ] ResizeModal.tsx
- [ ] QualityIndicator.tsx
- [ ] DownloadControls.tsx
- [ ] CheckoutForm.tsx
- [ ] HeroSection.tsx
- [ ] InstallBanner.tsx
- [ ] FinalCTA.tsx
- [ ] InteractiveGridPreview.tsx
- [ ] AddCardForm.tsx
- [ ] button.tsx

---

## ⏳ PENDENTE - Próximas Tarefas

### Semana 1 (Restante)
5. [ ] Implementar navegação por teclado
6. [ ] Criar componente ConfirmModal customizado
7. [ ] Testar com leitor de tela (NVDA/JAWS)

### Semana 2 - Performance
8. [ ] Dividir tools/page.tsx em componentes
9. [ ] Lazy load OpenCV.js
10. [ ] Adicionar React.memo em 10+ componentes
11. [ ] Adicionar Suspense boundaries
12. [ ] Refatorar lib/gemini.ts
13. [ ] Remover console.logs de produção
14. [ ] Re-habilitar redirect na landing page
15. [ ] Consolidar cache strategy

### Semana 3 - UX e Otimizações
16. [ ] Substituir window.location.reload()
17. [ ] Adicionar skeleton loaders
18. [ ] Melhorar feedback visual
19. [ ] Expandir tailwind.config.ts
20. [ ] Otimizar AnimatedCounter
21. [ ] Corrigir N+1 queries no admin

---

## 📝 INSTRUÇÕES PARA DEPLOY

### 1. Executar Migration no Supabase

```sql
-- Conectar ao Supabase Dashboard → SQL Editor
-- Executar: supabase/migrations/004_create_admin_users.sql
```

### 2. Adicionar Admins Iniciais

```sql
-- Encontrar user_id dos admins
SELECT id, email FROM users WHERE email IN (
  'erickrussomat@gmail.com',
  'yurilojavirtual@gmail.com'
);

-- Adicionar como superadmins
INSERT INTO admin_users (user_id, role, notes)
VALUES
  ('<user_id_erick>', 'superadmin', 'Admin original - fundador'),
  ('<user_id_yuri>', 'superadmin', 'Admin original - fundador')
ON CONFLICT (user_id) DO NOTHING;
```

### 3. Verificar Rate Limiting

```bash
# Verificar se Upstash Redis está configurado
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Se não estiver, adicionar em .env.local
```

### 4. Testar Mudanças

```bash
# Testar SSRF protection
curl -X POST http://localhost:3000/api/proxy-image \
  -H "Content-Type: application/json" \
  -d '{"url": "http://internal-server/secret"}'
# Deve retornar 403 Forbidden

# Testar rate limiting
# Fazer 61 requests em 1 minuto
# A 61ª deve retornar 429 Too Many Requests

# Testar admin check
# Usuário não-admin tentando acessar rota admin
# Deve retornar 403 Access Denied
```

---

## 📚 ARQUIVOS CRIADOS/MODIFICADOS

### Novos Arquivos
- ✅ `supabase/migrations/004_create_admin_users.sql`
- ✅ `scripts/migrate-admin-emails.js`
- ✅ `scripts/add-aria-labels.md`
- ✅ `SECURITY-IMPROVEMENTS.md` (este arquivo)

### Arquivos Modificados (20 total)
- ✅ `app/api/proxy-image/route.ts`
- ✅ `lib/auth.ts` (+112 linhas)
- ✅ `app/api/stencil/generate/route.ts`
- ✅ `app/api/tools/split-a4/route.ts`
- ✅ `app/api/tools/enhance/route.ts`
- ✅ `app/api/tools/color-match/route.ts`
- ✅ 14+ arquivos admin/debug

### Linhas de Código
- **Adicionadas:** ~500 linhas
- **Removidas:** ~100 linhas (hard-coded emails)
- **Modificadas:** ~200 linhas

---

## 🎯 PRÓXIMOS PASSOS RECOMENDADOS

1. **URGENTE:** Executar migration no Supabase (5 min)
2. **URGENTE:** Adicionar admins iniciais (2 min)
3. **IMPORTANTE:** Continuar com acessibilidade (2-3 horas)
4. **IMPORTANTE:** Testar todas as mudanças em staging (1 hora)
5. **OPCIONAL:** Deploy gradual em produção (1 dia)

---

## 🔗 RECURSOS

- [Migration SQL](./supabase/migrations/004_create_admin_users.sql)
- [Script de Migração](./scripts/migrate-admin-emails.js)
- [Rate Limiting Config](./lib/rate-limit.ts)
- [Auth Helpers](./lib/auth.ts)

---

**Gerado em:** 2025-12-28
**Por:** Claude Code (Anthropic)
**Versão:** 2.0.0
