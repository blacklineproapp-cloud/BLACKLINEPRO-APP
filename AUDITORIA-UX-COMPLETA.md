# 🎨 Auditoria Completa de UX - StencilFlow
**Data:** 17/12/2025
**Perspectiva:** Dev Full Stack Senior
**Objetivo:** Preparação para produção

---

## ✅ CORREÇÕES JÁ APLICADAS

### Editor
- ✅ Preview do estêncil agora tem mesmo tamanho do upload (`70vh` desktop)
- ✅ Botão vermelho (X) no header para resetar e fazer nova imagem
- ✅ Painel de controles abre automaticamente ao carregar imagem
- ✅ FAB (botão flutuante) ajusta posição quando painel abre

### Generator (IA Studio)
- ✅ Painel sempre inicia aberto no mobile
- ✅ FAB não sobrepõe conteúdo

### Dashboard Layout
- ✅ Header desktop com perfil do usuário
- ✅ UserButton no mobile (navbar inferior)
- ✅ Menu com: Perfil, Configurações, Gerenciar Assinatura, Sair

---

## 🔍 ANÁLISE POR PÁGINA

### 1. Dashboard (Galeria de Projetos)

**Desktop:**
- ✅ Grid responsivo de projetos
- ✅ Cards com preview + ações (editar/deletar)
- ⚠️ **FALTA:** Loading state ao carregar projetos
- ⚠️ **FALTA:** Empty state quando não há projetos
- ⚠️ **FALTA:** Filtros (por data, estilo, tamanho)
- ⚠️ **FALTA:** Busca por nome

**Mobile:**
- ✅ Cards empilhados verticalmente
- ⚠️ **FALTA:** Pull-to-refresh
- ⚠️ **FALTA:** Infinite scroll (se muitos projetos)

**Recomendações:**
```tsx
// Empty state
{projects.length === 0 && (
  <div className="text-center py-20">
    <ImageIcon className="w-16 h-16 mx-auto text-zinc-700 mb-4" />
    <h3 className="text-white font-semibold mb-2">Nenhum projeto ainda</h3>
    <p className="text-zinc-500 mb-6">Crie seu primeiro estêncil!</p>
    <Link href="/editor">
      <button className="bg-emerald-600 px-6 py-3 rounded-xl">
        Começar Agora
      </button>
    </Link>
  </div>
)}
```

---

### 2. Editor

**Fluxo Atual:**
1. Upload → Preview grande ✅
2. Configurar (tamanho, estilo) ✅
3. Gerar → Preview grande com Wipe/Blend ✅
4. Baixar ou Salvar ✅
5. **NOVO:** Botão X para resetar ✅

**Issues Identificadas:**
- ⚠️ **FALTA:** Confirmação antes de resetar (modal "Tem certeza?")
- ⚠️ **FALTA:** Indicador de progresso % durante geração
- ⚠️ **FALTA:** Toast de sucesso ao salvar
- ⚠️ **FALTA:** Histórico de versões (se gerar 2x a mesma imagem)
- ⚠️ **FALTA:** Zoom in/out na preview
- ⚠️ **FALTA:** Modo fullscreen para comparação

**Recomendações:**
```tsx
// Confirmação de reset
const confirmReset = () => {
  if (confirm('Descartar esta imagem e começar de novo?')) {
    handleNewUpload();
  }
};

// Progress indicator
{isProcessing && (
  <div className="text-center">
    <LoadingSpinner />
    <div className="mt-4 w-64 mx-auto bg-zinc-800 rounded-full h-2">
      <div
        className="bg-emerald-600 h-2 rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
    <p className="text-zinc-400 text-sm mt-2">{progress}%</p>
  </div>
)}
```

---

### 3. Generator (IA Studio)

**Status:** ⚠️ **NÃO FUNCIONAL**
**Motivo:** Gemini não gera imagens a partir de texto

**Opções:**
1. **Integrar Replicate (Stable Diffusion)** - $0.0023/imagem
2. **Usar DALL-E 3 (OpenAI)** - $0.04/imagem (1024x1024)
3. **Usar Imagen 3 (Google)** - Pricing similar
4. **REMOVER** temporariamente até implementar API real

**Recomendação:** Integrar Replicate ASAP (mais barato e confiável)

---

### 4. Tools (Enhance + Color Match)

**Desktop:**
- ✅ Tabs para alternar entre ferramentas
- ✅ Paywall se não desbloqueado

**Issues:**
- ⚠️ **FALTA:** Preview antes/depois (Enhance)
- ⚠️ **FALTA:** Paleta visual de cores (Color Match)
- ⚠️ **FALTA:** Download de PDF com paleta de cores

---

### 5. Navegação Geral

**Mobile:**
- ✅ Navbar inferior com 5 itens (Home, Editor, IA Gen, Tools, Perfil)
- ⚠️ **PROBLEMA:** Pode ficar apertado em telas pequenas (<360px)

**Desktop:**
- ✅ Sidebar esquerda
- ✅ Header superior com perfil

**Recomendações:**
- Adicionar breadcrumbs em páginas internas
- Adicionar indicador de "carregando" na navegação

---

## 🎯 PRIORIDADES DE UX (CRÍTICO → IMPORTANTE)

### 🔴 CRÍTICO (Bloqueador de Produção)

1. **Sistema de Créditos/Billing** - Sem isso, prejuízo garantido
2. **Generator não funciona** - Integrar API real ou remover
3. **Loading states** - App parece quebrado sem feedback visual
4. **Error handling** - Usuário não sabe o que deu errado

### 🟡 IMPORTANTE (Melhora Experiência)

5. **Empty states** - Dashboard vazio confunde usuário
6. **Confirmações** - Evitar ações acidentais (delete, reset)
7. **Toasts/Feedbacks** - Usuário não sabe se salvou
8. **Zoom/Fullscreen** - Tatuador precisa ver detalhes

### 🟢 DESEJÁVEL (Nice to Have)

9. **Filtros e busca** - Quando tiver muitos projetos
10. **Histórico de versões** - Ver iterações
11. **Modo escuro/claro** - Preferência do usuário
12. **Atalhos de teclado** - Power users

---

## 💰 SISTEMA DE CRÉDITOS - DESIGN

### Conceito

**Planos com limites mensais + créditos avulsos**

```
┌─────────────────────────────────────────┐
│ FREE TIER (Freemium)                    │
├─────────────────────────────────────────┤
│ • 5 estênceis topográficos/mês          │
│ • 10 estênceis linhas/mês               │
│ • 0 geração de ideias (IA Gen)          │
│ • 0 tools (enhance/color match)         │
│ • Marca d'água no PNG                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ PRO - R$ 29,90/mês                      │
├─────────────────────────────────────────┤
│ • 100 estênceis topográficos/mês        │
│ • 200 estênceis linhas/mês              │
│ • 50 gerações de ideias/mês             │
│ • 20 enhance + 20 color match           │
│ • Sem marca d'água                      │
│ • Prioridade no processamento           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ STUDIO - R$ 79,90/mês                   │
├─────────────────────────────────────────┤
│ • ILIMITADO estênceis                   │
│ • ILIMITADO geração de ideias           │
│ • ILIMITADO tools                       │
│ • API access                            │
│ • Suporte prioritário                   │
│ • Webhooks personalizados               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ CRÉDITOS AVULSOS (Pay-as-you-go)        │
├─────────────────────────────────────────┤
│ • 10 créditos - R$ 9,90                 │
│ • 50 créditos - R$ 39,90 (20% off)      │
│ • 100 créditos - R$ 69,90 (30% off)     │
│                                         │
│ Custo por operação:                     │
│ • Topográfico: 2 créditos               │
│ • Linhas: 1 crédito                     │
│ • IA Gen: 3 créditos                    │
│ • Enhance: 4 créditos                   │
│ • Color Match: 1 crédito                │
└─────────────────────────────────────────┘
```

### Cálculo de Custos (Gemini API)

**Pricing Gemini 2.5 Flash (Dezembro 2024):**
- Input: $0.00001875 / 1K tokens
- Output: $0.000075 / 1K tokens
- Image input: $0.0001265 / image

**Estimativa por operação:**

```javascript
// Topográfico (prompt longo + imagem)
const topographic = {
  inputTokens: 800,        // Prompt detalhado
  outputTokens: 2000,      // Resposta longa
  imageInput: 1,           // 1 imagem

  cost: (
    (800 / 1000 * 0.00001875) +      // Input: $0.000015
    (2000 / 1000 * 0.000075) +       // Output: $0.00015
    (1 * 0.0001265)                   // Image: $0.0001265
  ),

  total: 0.00029175  // ~$0.0003 = R$ 0,0015 (cotação 5,00)
}

// Linhas (prompt médio + imagem)
const lines = {
  cost: 0.00020,     // ~R$ 0,001
}

// IA Gen (ESTIMATIVA - depende da API escolhida)
const iaGen = {
  replicate_sd: 0.0023,    // Stable Diffusion
  dalle3: 0.04,            // DALL-E 3
  cost: 0.0023,            // Usando Replicate
  total_brl: 0.0115        // R$ 0,0115
}

// Enhance (upscale)
const enhance = {
  cost: 0.0008,      // ~R$ 0,004
}

// Color Match (análise)
const colorMatch = {
  cost: 0.00015,     // ~R$ 0,00075
}
```

**MARGEM DE LUCRO:**

```javascript
// Plano PRO - R$ 29,90/mês
const proRevenue = 29.90;
const proCosts = (
  (100 * 0.0015) +    // 100 topográficos = R$ 0,15
  (200 * 0.001) +     // 200 linhas = R$ 0,20
  (50 * 0.0115) +     // 50 IA Gen = R$ 0,575
  (20 * 0.004) +      // 20 enhance = R$ 0,08
  (20 * 0.00075)      // 20 color match = R$ 0,015
);

const proProfit = proRevenue - proCosts;  // R$ 28,88 (~97% margem!)

// Créditos avulsos - 10 créditos por R$ 9,90
const creditsCost = (10 / 2) * 0.0015;    // 5 topográficos = R$ 0,0075
const creditsProfit = 9.90 - 0.0075;      // R$ 9,89 (~99,9% margem!)
```

**CONCLUSÃO:** Margem EXCELENTE. Pode ter pricing agressivo.

---

## 🗄️ SCHEMA DO BANCO (Créditos)

```sql
-- Adicionar à tabela users
ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN plan VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN plan_limits JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN usage_this_month JSONB DEFAULT '{}';

-- Tabela de histórico de uso
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  operation_type VARCHAR(50),  -- 'topographic', 'lines', 'ia_gen', etc
  credits_used INTEGER,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Tabela de transações de créditos
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount INTEGER,  -- Positivo = compra, negativo = uso
  type VARCHAR(20),  -- 'purchase', 'usage', 'refund', 'bonus'
  stripe_payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Função para resetar limites mensais (executar todo dia 1)
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET usage_this_month = '{}'
  WHERE plan IN ('free', 'pro');
END;
$$ LANGUAGE plpgsql;
```

---

## 📱 PÁGINA DE CONFIGURAÇÕES/PERFIL

### Estrutura

```
/dashboard?settings=true  OU  /settings

┌─────────────────────────────────────────┐
│ Header                                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────┬────────────────────────┐ │
│  │           │                        │ │
│  │ Sidebar   │  Content Area          │ │
│  │           │                        │ │
│  │ • Perfil  │  [Conteúdo dinâmico]   │ │
│  │ • Plano   │                        │ │
│  │ • Créditos│                        │ │
│  │ • Uso     │                        │ │
│  │ • API     │                        │ │
│  └───────────┴────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Tabs

**1. Perfil**
- Nome, email, foto
- Timezone
- Preferências de notificações

**2. Plano & Assinatura**
- Plano atual (Free/Pro/Studio)
- Botão "Upgrade" ou "Gerenciar no Stripe"
- Detalhes de renovação

**3. Créditos**
- Saldo atual
- Histórico de compras
- Botão "Comprar Créditos"

**4. Uso**
- Gráfico de uso mensal
- Breakdown por operação
- Limites restantes

**5. API (Studio only)**
- API Key
- Webhooks
- Documentação

---

## 🚀 ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: UX Crítico (1-2 dias)
1. ✅ Corrigir preview do editor
2. ✅ Botão de reset
3. ⏳ Loading states em todas páginas
4. ⏳ Error handling com Toasts
5. ⏳ Empty states

### Fase 2: Sistema de Créditos (2-3 dias)
6. ⏳ Schema do banco
7. ⏳ Lógica de consumo de créditos
8. ⏳ Integração com Stripe (planos + créditos avulsos)
9. ⏳ Middleware de verificação de créditos
10. ⏳ Reset mensal automático

### Fase 3: Página de Configurações (1-2 dias)
11. ⏳ Layout base
12. ⏳ Tab de Plano
13. ⏳ Tab de Créditos
14. ⏳ Tab de Uso (gráficos)

### Fase 4: IA Gen (2-3 dias)
15. ⏳ Integrar Replicate (Stable Diffusion)
16. ⏳ Testar e ajustar prompts
17. ⏳ Consumo de créditos

### Fase 5: Polimento (1-2 dias)
18. ⏳ Confirmações e modais
19. ⏳ Zoom/Fullscreen
20. ⏳ Otimizações de performance

**TOTAL: ~10-15 dias** para produção completa

---

## 📊 MÉTRICAS PARA MONITORAR

1. **Taxa de conversão Free → Pro**
2. **Churn rate** (cancelamentos)
3. **Uso médio por plano**
4. **Custo por usuário** (API costs)
5. **Tempo médio de geração**
6. **Taxa de erro** (API failures)

---

**Próximos passos:** Implementar sistema de créditos primeiro (crítico para produção).
