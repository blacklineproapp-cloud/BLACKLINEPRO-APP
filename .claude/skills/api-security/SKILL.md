---
name: api-security
description: Reviews API routes for security vulnerabilities. Checks Clerk authentication, Supabase RLS, Stripe webhooks, and input validation. Use when reviewing API endpoints or security-critical code.
allowed-tools: Read, Grep
---

# API Security Review - StencilFlow

## CHECKLIST DE SEGURANÇA

### 1. Autenticação (Clerk)

```typescript
// ✅ OBRIGATÓRIO em TODAS as rotas protegidas:
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    );
  }

  // ... resto do código
}

// ❌ NUNCA confiar em headers customizados:
const userId = req.headers.get('x-user-id'); // INSEGURO!
```

### 2. Supabase RLS (Row Level Security)

```typescript
// ✅ VERIFICAR:
// - RLS está HABILITADO em todas as tabelas
// - Policies estão corretas
// - service_role_key NUNCA exposto ao cliente

// ✅ BOM: Usar supabaseAdmin (server-side)
import { supabaseAdmin } from '@/lib/supabase';

const { data } = await supabaseAdmin
  .from('users')
  .select('*')
  .eq('clerk_id', userId);

// ❌ RUIM: Supabase client no server (menos seguro)
// Sempre prefer supabaseAdmin
```

### 3. Stripe Webhooks

```typescript
// ✅ VALIDAÇÃO DE SIGNATURE (OBRIGATÓRIA):
const sig = headers.get('stripe-signature');

if (!sig) {
  return NextResponse.json({ error: 'No signature' }, { status: 400 });
}

try {
  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
} catch (err) {
  console.error('Webhook signature verification failed:', err.message);
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}

// ❌ NUNCA processar webhook sem validar signature
```

### 4. Input Validation

```typescript
// ✅ SEMPRE validar e sanitizar inputs:
const body = await req.json();

// Validar tipos
if (typeof body.email !== 'string') {
  return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
}

// Validar formato
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(body.email)) {
  return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
}

// Sanitizar (prevenir injection)
const cleanEmail = body.email.trim().toLowerCase();

// ❌ NUNCA usar inputs direto em queries sem validação
```

### 5. API Keys e Secrets

```typescript
// ✅ BOM: API keys no servidor
const geminiResponse = await fetch('https://api.gemini.com', {
  headers: {
    'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
  }
});

// ❌ RUIM: API keys no cliente
// NUNCA usar process.env.GEMINI_API_KEY em componentes client

// ❌ RUIM: Logar secrets
console.log('API Key:', process.env.GEMINI_API_KEY); // INSEGURO!

// ✅ BOM: Logar sem expor secrets
console.log('API Key present:', !!process.env.GEMINI_API_KEY);
```

### 6. Rate Limiting

```typescript
// ✅ OBRIGATÓRIO em APIs públicas e de custo:
import { createStencilLimiter, checkRateLimit } from '@/lib/rate-limit';

const limiter = createStencilLimiter(userPlan);
const result = await checkRateLimit(limiter, userId);

if (!result.success) {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      reset: new Date(result.reset).toISOString()
    },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString()
      }
    }
  );
}
```

### 7. SQL Injection Prevention

```typescript
// ✅ BOM: Usar query builder do Supabase
const { data } = await supabaseAdmin
  .from('users')
  .select('*')
  .eq('email', userEmail); // Parametrizado

// ❌ RUIM: String concatenation (SQL injection)
const query = `SELECT * FROM users WHERE email = '${userEmail}'`; // INSEGURO!

// ❌ RUIM: .rpc() sem validação
const { data } = await supabaseAdmin.rpc('custom_function', {
  user_input: userInput // Validar ANTES!
});
```

### 8. CORS (Cross-Origin)

```typescript
// ✅ Configurar CORS adequadamente:
const headers = new Headers({
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL!,
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
});

// ❌ NUNCA usar wildcard em produção:
'Access-Control-Allow-Origin': '*' // INSEGURO!
```

---

## 🚨 VULNERABILIDADES COMUNS

### 1. Missing Authentication
```typescript
// ❌ VULNERÁVEL:
export async function POST(req: Request) {
  const { userId } = await req.json(); // Vindo do cliente!

  // Atacante pode enviar qualquer userId
  const { data } = await supabaseAdmin
    .from('users')
    .update({ is_paid: true })
    .eq('id', userId);
}

// ✅ CORRIGIDO:
export async function POST(req: Request) {
  const { userId } = await auth(); // Validado pelo Clerk
  if (!userId) return 401;

  // Buscar UUID do banco
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  // Usar UUID validado
  await supabaseAdmin
    .from('users')
    .update({ is_paid: true })
    .eq('id', user.id);
}
```

### 2. Exposed API Keys
```typescript
// ❌ VULNERÁVEL:
// components/ImageEditor.tsx (CLIENT)
const response = await fetch('https://api.gemini.com', {
  headers: {
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GEMINI_KEY}` // EXPOSTO!
  }
});

// ✅ CORRIGIDO:
// Criar API route intermediária
// app/api/gemini/process/route.ts (SERVER)
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return 401;

  const response = await fetch('https://api.gemini.com', {
    headers: {
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}` // SEGURO
    }
  });

  return NextResponse.json(response.data);
}
```

### 3. Insecure Direct Object Reference (IDOR)
```typescript
// ❌ VULNERÁVEL:
// DELETE /api/projects/[id]
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Sem validação de ownership!
  await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', params.id);
}

// ✅ CORRIGIDO:
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return 401;

  // Buscar projeto e validar ownership
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('user_id')
    .eq('id', params.id)
    .single();

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Agora sim, deletar
  await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', params.id);
}
```

---

## FORMATO DE FEEDBACK

### 🔴 Crítico:
- Falta de autenticação
- API keys expostas
- SQL injection possível
- Webhook sem validação

### 🟡 Aviso:
- Rate limiting ausente
- Input validation fraca
- CORS muito permissivo
- Logs expondo dados sensíveis

### 🟢 Sugestão:
- Adicionar 2FA para admin
- Implementar request signing
- Adicionar audit logs
