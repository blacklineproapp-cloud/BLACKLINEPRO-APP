# 🧪 Modo Experimental: Pipeline Topográfico → Linhas

**Status:** ✅ IMPLEMENTADO (aguardando testes)
**Data:** 2026-01-02
**Versão:** 1.0

---

## 🎯 Conceito

Pipeline de **2 etapas** que gera linhas a partir do topográfico, em vez de gerar linhas diretamente da foto.

### **Fluxo Atual (Standard):**
```
Foto Original → Gemini (Linhas) → Stencil Linhas
                  ~10-15s
```

### **Fluxo Experimental (Pipeline):**
```
Foto Original → Gemini (Topográfico V3.0) → Stencil Rico (7 níveis)
                  ~10-15s                         ↓
                                          Gemini (Simplificar)
                                                  ↓
                                          Stencil Linhas
                  Total: ~20-30s
```

---

## 📦 Implementação

### **Arquivos Modificados:**

1. **`lib/prompts-optimized.ts`** (linhas 257-330)
   - Novo prompt: `SIMPLIFY_TOPOGRAPHIC_TO_LINES`
   - Converte topográfico (7 níveis) em linhas (3 tons)

2. **`lib/gemini.ts`** (linhas 533-612)
   - Nova função: `generateLinesFromTopographic()`
   - Executa pipeline completo

---

## 🔧 Como Funciona

### **ETAPA 1: Gerar Topográfico**
```typescript
const topographicStencil = await generateStencilFromImage(
  base64Image,
  promptDetails,
  'perfect_lines' // Topográfico V3.0 (7 níveis)
);
```

**Resultado:** Stencil ultra-detalhado com:
- 7 níveis tonais
- Profundidade 3D rica
- Micro-detalhes (poros, texturas)
- Estrutura precisa

---

### **ETAPA 2: Simplificar para Linhas**
```typescript
const simplifyPrompt = SIMPLIFY_TOPOGRAPHIC_TO_LINES;

const result = await linesModel.generateContent({
  contents: [{
    role: 'user',
    parts: [
      { text: simplifyPrompt },
      { inlineData: { mimeType: 'image/png', data: topoBase64 } }
    ]
  }]
});
```

**Processo de Simplificação:**
1. **Extrai contornos principais** do topográfico
2. **Converte 7 níveis → 3 tons básicos**
   - Níveis 1-3 (dense) → DARK hatching
   - Níveis 4-5 (medium) → MEDIUM hatching
   - Níveis 6-7 (highlights) → WHITE
3. **Remove micro-texturas** (poros, rugas finas)
4. **Agrupa texturas complexas**
   - Fios individuais → massas de cabelo
   - Íris detalhada → linhas radiais simples
5. **Mantém estrutura 100%**

---

## ✅ Vantagens

| Aspecto | Valor |
|---------|-------|
| **Consistência estrutural** | ✅ ALTA - Topográfico já identificou tudo |
| **Qualidade de contornos** | ✅ SUPERIOR - Herda precisão do topográfico |
| **Fidelidade anatômica** | ✅ PERFEITA - Sem "criatividade" indesejada |
| **Simplicidade resultado** | ✅ CONTROLADA - Apenas simplifica, não interpreta |

---

## ❌ Desvantagens

| Aspecto | Valor |
|---------|-------|
| **Custo** | ❌ DOBRO - 2 chamadas Gemini |
| **Tempo** | ❌ +100% - ~20-30s vs ~10-15s |
| **Complexidade** | ⚠️ MAIOR - Mais pontos de falha |

---

## 💰 Análise de Custo

### **Por Geração:**
- **Atual (Linhas):** 1 request Gemini
- **Pipeline:** 2 requests Gemini (+100%)

### **Exemplo (100 gerações):**
- **Atual:** 100 requests
- **Pipeline:** 200 requests

**Custo adicional estimado:** ~$0.02-0.05 por geração (dependendo do pricing Gemini)

---

## 🧪 Como Testar

### **Opção 1: API Direta**
```typescript
import { generateLinesFromTopographic } from '@/lib/gemini';

const result = await generateLinesFromTopographic(
  photoBase64,
  'Detalhes opcionais do prompt'
);

console.log('Topográfico:', result.topographic);
console.log('Linhas:', result.lines);
console.log('Tempo total:', result.totalTime, 'ms');
```

### **Opção 2: Integrar no Editor** (futuro)
Adicionar checkbox:
```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={usePipeline}
    onChange={(e) => setUsePipeline(e.target.checked)}
  />
  <span>🧪 Modo Experimental: Gerar linhas a partir do topográfico</span>
  <span className="text-xs text-zinc-500">(mais lento, mais preciso)</span>
</label>
```

---

## 📊 Comparação Esperada

### **Teste Proposto:**

1. **Escolher foto complexa** (retrato com detalhes)

2. **Gerar pelos 2 métodos:**
   - Método A: Linhas direto
   - Método B: Pipeline (Topo → Linhas)

3. **Comparar:**
   - Precisão dos contornos
   - Fidelidade estrutural
   - Simplicidade do resultado
   - Tempo de geração

---

## 🎯 Casos de Uso Ideais

### **Quando USAR Pipeline:**
- ✅ Retratos complexos (rostos)
- ✅ Anatomia precisa crítica
- ✅ Cliente exigente com fidelidade
- ✅ Fotos com muitos detalhes sutis
- ✅ Trabalhos premium (justifica tempo/custo)

### **Quando NÃO USAR:**
- ❌ Fotos simples (logos, símbolos)
- ❌ Usuário quer rapidez
- ❌ Custo é prioridade
- ❌ Estrutura básica é suficiente

---

## 🚀 Próximos Passos

### **Fase 1: Teste Interno** (atual)
- [x] Implementar pipeline
- [ ] Testar com 5-10 fotos diferentes
- [ ] Comparar com método direto
- [ ] Documentar resultados

### **Fase 2: Integração UI** (se testes forem positivos)
- [ ] Adicionar checkbox no editor
- [ ] Mensagem de progresso (2 etapas)
- [ ] Mostrar ambos resultados (topo + linhas)
- [ ] Permitir escolher qual salvar

### **Fase 3: Otimização** (se virar padrão)
- [ ] Batch processing (pré-gerar topográficos)
- [ ] Cache de topográficos comuns
- [ ] Parallel requests (se Gemini permitir)

---

## 📝 Exemplo de Log

```
[Pipeline 2-Etapas] Iniciando: Topográfico → Linhas
[Pipeline 2-Etapas] ETAPA 1: Gerando topográfico...
[Gemini] TOPOGRÁFICO V3.0 (temp: 0, topP: 0.15, topK: 10) - 7 NÍVEIS, MÁXIMA RIQUEZA
[Pipeline 2-Etapas] ✅ Topográfico gerado
[Pipeline 2-Etapas] ETAPA 2: Simplificando para linhas...
[Gemini] LINHAS (temp: 0, topP: 0.08, topK: 4) - SIMPLES E LIMPO
[Pipeline 2-Etapas] ✅ Concluído em 24.3s
```

---

## 🔬 Métricas para Validação

| Métrica | Objetivo |
|---------|----------|
| **Tempo médio** | < 30s |
| **Taxa de sucesso** | > 95% |
| **Qualidade vs direto** | Notavelmente superior |
| **Satisfação usuário** | Preferem pipeline |
| **Custo aceitável** | < $0.10 por geração |

---

**Status:** ✅ Pronto para testes
**Próximo:** Testar com imagens reais e comparar resultados

**Implementado por:** Claude Code
**Versão:** 1.0
