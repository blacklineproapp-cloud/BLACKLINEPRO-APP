# 📋 CHECKLIST: Adicionar ARIA Labels

Este documento lista todos os botões que precisam de aria-label.

## Botões Identificados

### 1. ImageCropControl.tsx
- [ ] Botão Zoom Out: `<ZoomOut size={16} />`
- [ ] Botão Zoom In: `<ZoomIn size={16} />`
- [ ] Botão Reset Zoom: `<Maximize2 size={16} />`
- [ ] Botão Rodar -90°: `<RotateCcw size={16} />`
- [ ] Botão Rodar +90°: `<RotateCcw size={16} className="transform scale-x-[-1]" />`
- [ ] Botão Reset Rotação: "0°"
- [ ] Botão Flip H: `<FlipHorizontal size={16} />`
- [ ] Botão Flip V: `<FlipVertical size={16} />`
- [ ] Botão Centralizar: `<Maximize2 size={16} />`
- [ ] Botão Resetar Tudo: `<RotateCcw size={16} />`

### 2. ProjectCard.tsx
- [ ] Botão Download: `<Download size={18} />`
- [ ] Botão Delete: `<Trash size={18} />`

### 3. ProfessionalControls.tsx
- [ ] Botões de controle do editor

### 4. StencilAdjustControls.tsx
- [ ] Botões de ajuste

### 5. Outros componentes
- [ ] CheckoutModal.tsx
- [ ] AddCardModal.tsx
- [ ] ResizeModal.tsx
- [ ] QualityIndicator.tsx
- [ ] DownloadControls.tsx

## Padrões de ARIA Labels

```typescript
// ❌ ANTES
<button onClick={handleZoomIn}>
  <ZoomIn size={16} />
</button>

// ✅ DEPOIS
<button onClick={handleZoomIn} aria-label="Aumentar zoom">
  <ZoomIn size={16} />
</button>
```

## Implementação

Arquivos modificados: 0/16
Botões com aria-label adicionados: 0/50+
