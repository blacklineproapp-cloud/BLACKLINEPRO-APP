# 📖 API Documentation - StencilFlow

> Documentação completa das APIs públicas do StencilFlow

---

## 🔐 Autenticação

Todas as APIs requerem autenticação via **Clerk**. O token JWT é enviado automaticamente via cookies de sessão.

**Headers automáticos:**
```
Cookie: __session=<clerk_session_token>
```

---

## 📍 Base URL

| Ambiente | URL |
|----------|-----|
| Produção | `https://stencilflow.com.br` |
| Development | `http://localhost:3000` |

---

## 🎨 Stencil APIs

### POST `/api/stencil/generate`

Gera um estêncil de tatuagem a partir de uma imagem usando Gemini 2.5 Flash.

**Request:**
```json
{
  "image": "data:image/png;base64,...",
  "style": "standard",
  "promptDetails": "Adicionar mais detalhes nas sombras"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `image` | string (base64) | ✅ | Imagem fonte (max 4MB) |
| `style` | enum | ❌ | `standard` (default) ou `perfect_lines` |
| `promptDetails` | string | ❌ | Instruções adicionais (max 1000 chars) |

**Response (200):**
```json
{
  "image": "data:image/png;base64,..."
}
```

**Errors:**
| Status | Erro | Descrição |
|--------|------|-----------|
| 401 | Não autenticado | Usuário não logado |
| 403 | Assinatura necessária | Plano free sem acesso |
| 413 | Imagem muito grande | Excede 4MB |
| 429 | Rate limit | Muitas requisições |

---

## 🛠️ Tools APIs

### POST `/api/tools/ia-gen`

Gera uma imagem de tatuagem a partir de texto usando IA.

**Request:**
```json
{
  "prompt": "Dragão japonês em preto e branco",
  "size": "2K",
  "referenceImage": "data:image/png;base64,..." 
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `prompt` | string | ✅ | Descrição da tatuagem |
| `size` | enum | ❌ | `1K`, `2K` (default), `4K` |
| `referenceImage` | string | ❌ | Imagem de referência (base64) |

**Response (200):**
```json
{
  "image": "data:image/png;base64,..."
}
```

---

### POST `/api/tools/enhance`

Melhora a qualidade de uma imagem (upscale 4K).

**Request:**
```json
{
  "image": "data:image/png;base64,..."
}
```

**Response (200):**
```json
{
  "image": "data:image/png;base64,..."
}
```

---

### POST `/api/tools/remove-bg`

Remove o fundo de uma imagem, deixando apenas o elemento principal.

**Request:**
```json
{
  "image": "data:image/png;base64,..."
}
```

**Response (200):**
```json
{
  "image": "data:image/png;base64,..."
}
```

---

### POST `/api/tools/color-match`

Analisa cores da imagem e sugere tintas de tatuagem compatíveis.

**Request:**
```json
{
  "image": "data:image/png;base64,...",
  "brand": "Electric Ink"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `image` | string | ✅ | Imagem para análise |
| `brand` | string | ❌ | Marca de tintas (default: Electric Ink) |

**Response (200):**
```json
{
  "summary": "Esta tatuagem usa tons quentes com destaque em vermelho",
  "colors": [
    {
      "hex": "#FF5733",
      "name": "Ruby Red",
      "usage": "Destaque principal nas flores"
    }
  ]
}
```

---

### POST `/api/tools/split-a4/prepare`

Prepara uma imagem grande para divisão em folhas A4.

**Request:**
```json
{
  "image": "data:image/png;base64,...",
  "widthCm": 30,
  "heightCm": 40,
  "overlap": 1.5
}
```

**Response (200):**
```json
{
  "preview": "data:image/png;base64,...",
  "sheets": {
    "horizontal": 2,
    "vertical": 3,
    "total": 6
  }
}
```

---

### POST `/api/tools/split-a4/generate`

Gera as folhas A4 para download.

**Request:**
```json
{
  "image": "data:image/png;base64,...",
  "widthCm": 30,
  "heightCm": 40,
  "overlap": 1.5,
  "format": "pdf"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `format` | enum | ❌ | `pdf` (default) ou `zip` |

**Response (200):** Binary file (PDF ou ZIP)

---

## 💳 Payments APIs

### POST `/api/payments/create-checkout`

Cria sessão de checkout Stripe.

**Request:**
```json
{
  "plan": "pro",
  "billing": "monthly"
}
```

| Campo | Tipo | Valores |
|-------|------|---------|
| `plan` | string | `starter`, `pro`, `studio`, `enterprise` |
| `billing` | string | `monthly`, `semiannual` |

**Response (200):**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

### GET `/api/payments/status`

Retorna status da assinatura do usuário.

**Response (200):**
```json
{
  "plan": "pro",
  "status": "active",
  "currentPeriodEnd": "2026-02-15T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

---

## 📊 User APIs

### GET `/api/user/usage`

Retorna estatísticas de uso do usuário.

**Response (200):**
```json
{
  "plan": "pro",
  "credits": 150,
  "usage": {
    "editor_generation": 45,
    "ia_gen": 12,
    "enhance": 8
  },
  "limits": {
    "editor_generation": 500,
    "ia_gen": 100
  }
}
```

---

### GET `/api/gallery`

Lista projetos salvos do usuário.

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `page` | number | Página (default: 1) |
| `limit` | number | Itens por página (default: 20) |

**Response (200):**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Dragão Oriental",
      "thumbnail_url": "https://...",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "totalPages": 3
}
```

---

## 🔔 Webhooks

### POST `/api/webhooks/stripe`

Recebe eventos do Stripe (subscriptions, payments).

**Eventos tratados:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

---

### POST `/api/webhooks/clerk`

Recebe eventos do Clerk (user management).

**Eventos tratados:**
- `user.created`
- `user.updated`
- `user.deleted`

---

## ⚠️ Rate Limits

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `/api/stencil/generate` | 10 req | 1 min |
| `/api/tools/*` | 20 req | 1 min |
| `/api/payments/*` | 5 req | 1 min |

---

## 📝 Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Parâmetros inválidos |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão/assinatura |
| 404 | Not Found - Recurso não encontrado |
| 413 | Payload Too Large - Imagem muito grande |
| 429 | Too Many Requests - Rate limit |
| 500 | Internal Server Error |

---

## 🔧 Headers de Segurança

Todas as respostas incluem:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; ...
```
