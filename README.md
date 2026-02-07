# 🎨 StencilFlow

> Plataforma SaaS para criação de estênceis de tatuagem usando IA Generativa (Gemini 2.5 Flash)

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Asaas](https://img.shields.io/badge/Asaas-Payments-blue)](https://asaas.com/)

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Conta Clerk (autenticação)
- Conta Supabase (banco de dados)
- Conta Asaas (pagamentos)
- API Key do Google Gemini

### 1. Clone e instale

```bash
git clone <repository-url>
cd stencilflow-nextjs
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Asaas
ASAAS_API_KEY=...
ASAAS_WEBHOOK_TOKEN=...

# Google Gemini AI
GEMINI_API_KEY=AIza...

# Redis (opcional em dev, obrigatório em prod)
REDIS_URL=redis://localhost:6379

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Execute o projeto

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build
npm start
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 📁 Estrutura do Projeto

```
stencilflow-nextjs/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Área logada
│   │   ├── admin/          # Painel administrativo (39 APIs)
│   │   ├── dashboard/      # Dashboard do usuário
│   │   ├── editor/         # Editor de stencil
│   │   └── tools/          # Ferramentas de IA
│   ├── api/                # API Routes (81 endpoints)
│   │   ├── admin/          # APIs admin
│   │   ├── stencil/        # Geração de stencil
│   │   ├── tools/          # Ferramentas de IA
│   │   ├── payments/       # Asaas checkout
│   │   └── webhooks/       # Clerk + Asaas webhooks
│   └── (legal)/            # Páginas públicas (termos, privacidade)
├── components/             # Componentes React (35 arquivos)
├── lib/                    # Bibliotecas core (47 arquivos)
│   ├── auth.ts             # Autenticação e roles
│   ├── credits.ts          # Sistema de créditos
│   ├── gemini.ts           # Integração Gemini AI
│   ├── queue.ts            # BullMQ job queues
│   ├── cache-redis.ts      # Cache híbrido Redis
│   └── asaas/              # Serviços Asaas
├── emails/                 # Templates de email (Resend)
├── scripts/                # Scripts de manutenção (99 arquivos)
├── migrations/             # SQL migrations (14 arquivos)
└── public/                 # Assets estáticos + PWA
```

---

## 🔌 API Reference

### Autenticação

Todas as APIs requerem autenticação via Clerk. O token é enviado automaticamente via cookies.

### Endpoints Principais

#### Stencil Generation

```
POST /api/stencil/generate
```

Gera um estêncil de tatuagem a partir de uma imagem.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `image` | string (base64) | Imagem fonte |
| `style` | `standard` \| `perfect_lines` | Estilo do estêncil |
| `promptDetails` | string | Instruções adicionais (opcional, max 1000 chars) |

**Resposta:**
```json
{
  "image": "data:image/png;base64,..."
}
```

---

#### Tools - IA Gen

```
POST /api/tools/ia-gen
```

Gera uma imagem de tatuagem a partir de texto.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `prompt` | string | Descrição da tatuagem |
| `size` | `1K` \| `2K` \| `4K` | Tamanho da imagem |

---

#### Tools - Enhance

```
POST /api/tools/enhance
```

Melhora a qualidade de uma imagem (upscale 4K).

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `image` | string (base64) | Imagem para melhorar |

---

#### Tools - Remove Background

```
POST /api/tools/remove-bg
```

Remove o fundo de uma imagem.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `image` | string (base64) | Imagem |

---

#### Tools - Color Match

```
POST /api/tools/color-match
```

Analisa cores da imagem e sugere tintas compatíveis.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `image` | string (base64) | Imagem para análise |
| `brand` | string | Marca de tintas (default: Electric Ink) |

---

#### Tools - Split A4

```
POST /api/tools/split-a4/prepare
POST /api/tools/split-a4/generate
```

Divide uma imagem em folhas A4 para impressão.

---

## 🛠️ Scripts Úteis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm run lint             # ESLint

# Asaas
npm run asaas:setup      # Configuração inicial (se houver)

# Emails
npm run email:dev        # Preview de emails
npm run email:sync       # Sincronizar templates

# Manutenção
npm run diagnose:db      # Diagnóstico do banco
npm run cleanup          # Limpar dados antigos
npm run remarketing      # Enviar emails de remarketing
```

---

## 🔒 Segurança

O projeto implementa:

- **CSRF Protection** - Validação de Origin/Referer
- **Content Security Policy** - Headers CSP restritivos
- **HSTS** - 2 anos com preload
- **Row Level Security** - RLS no Supabase
- **Rate Limiting** - Por usuário e por IP
- **Abuse Prevention** - Detecção de múltiplas contas

---

## 📊 Monitoramento

- **Sentry** - Error tracking
- **Admin Panel** - Métricas em tempo real
- **Scripts de Auditoria** - 99 scripts de diagnóstico

---

## 🚢 Deploy

### Vercel (Recomendado)

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Railway (Worker)

O projeto inclui configuração para Railway worker (BullMQ):

```bash
npm run worker
```

---

## 📄 Licença

Proprietary - StencilFlow © 2024-2026
