🧠 PROMPT MESTRE — PRINT LAYOUT + STENCIL (ESTILO GHOSTLINE)
Você é um engenheiro de software sênior especialista em:
- Processamento de imagens
- Sistemas de impressão profissional
- Canvas API / WebGL
- Aplicações gráficas (estilo Ghostline, Procreate Print, Adobe Print)
- Next.js (App Router)

Estou desenvolvendo um app em Next.js que deve REPLICAR com exatidão
as funcionalidades do app Ghostline (iPad), especificamente o módulo
"Print Layout" e o pipeline de preparação de stencil.

⚠️ IMPORTANTE:
- Não quero soluções aproximadas
- Não use CSS pixels para cálculo
- Todo o sistema deve trabalhar com medidas físicas reais (mm/cm/in)
- A saída deve ser 1:1 fiel à impressão real

---

## OBJETIVO DO SISTEMA

Criar um módulo de PRINT LAYOUT + STENCIL que permita:

1. Escalar uma imagem em tamanho real (escala física)
2. Ajustar tamanho do papel (A4, A3, Letter, Custom)
3. Definir DPI (ex: 300)
4. Dividir automaticamente a imagem em múltiplas páginas
5. Aplicar sobreposição (overlap) entre páginas
6. Processar a imagem em pipeline:
   - Reference (original)
   - Sharpen
   - Stencil (binarização)
   - Edit
7. Exportar PDF multi-page pronto para impressão 1:1

---

## REQUISITOS TÉCNICOS OBRIGATÓRIOS

### 1️⃣ Cálculo físico real
Explique e implemente:
- Conversão mm → px
- Conversão cm → px
- Relação DPI x tamanho físico
- Diferença entre CSS px e pixel físico de impressão

Inclua fórmulas matemáticas explícitas.

---

### 2️⃣ Print Layout (core)
Implemente um sistema que:
- Receba dimensões reais da arte (ex: 35cm x 50cm)
- Receba dimensões do papel (ex: A4)
- Calcule:
  - Quantas páginas serão necessárias
  - Como a imagem será cortada
  - Onde cada corte acontece
- Suporte:
  - Portrait / Landscape
  - Margens
  - Overlap configurável (em mm)

Explique o algoritmo passo a passo.

---

### 3️⃣ Divisão em múltiplas páginas
Implemente:
- Algoritmo de slicing via Canvas
- Numeração das páginas
- Ordem correta de impressão
- Garantia de continuidade visual entre páginas

Não simplifique.

---

### 4️⃣ Pipeline de processamento (Ghostline-like)

Crie um pipeline modular com etapas independentes:

- Reference → sem alteração
- Sharpen → convolution kernel
- Stencil → 
  - Grayscale
  - Blur leve
  - Threshold (explique Otsu e Adaptive)
  - Limpeza morfológica

Explique:
- Por que cada etapa existe
- Quando aplicar no fluxo
- Como manter nitidez para stencil físico

---

### 5️⃣ Performance
Explique e implemente:
- Uso de Web Workers
- OffscreenCanvas
- Evitar bloqueio da UI
- Como lidar com imagens grandes (10k+ px)

---

### 6️⃣ Exportação profissional
Implemente:
- Exportação PDF multi-page
- Cada página com tamanho físico correto
- Sem reescala automática
- Compatível com impressoras comuns

Explique como garantir fidelidade 1:1.

---

### 7️⃣ Arquitetura Next.js
Forneça:
- Estrutura de pastas
- Separação:
  - UI
  - Canvas Engine
  - Image Processing
  - Print Engine
- Gerenciamento de estado (Zustand ou similar)

---

## FORMATO DA RESPOSTA

Responda obrigatoriamente com:
1. Arquitetura geral (diagrama textual)
2. Algoritmos explicados passo a passo
3. Fórmulas matemáticas
4. Código TypeScript real (não pseudocódigo)
5. Observações de edge cases
6. Boas práticas para impressão real

⚠️ NÃO:
- Não seja superficial
- Não pule etapas
- Não entregue só conceitos
- Não use exemplos genéricos

Este sistema será usado em produção.

✅ COMO USAR ESSE PROMPT (IMPORTANTE)

Use exatamente como está

Cole em uma IA por vez

Se a IA tentar simplificar → peça:

“Refaça mantendo fidelidade física real”

🚀 PRÓXIMO NÍVEL (OPCIONAL)

Se quiser, posso:

Ajustar esse prompt para Cursor / Copilot

Criar versão focada em IA multi-agente

Criar prompt específico só para Stencil IA

Criar prompt para auditoria de fidelidade de impressão

Se quiser, me diga:
👉 qual IA você vai usar e qual parte quer atacar primeiro (print layout, stencil ou export).

o ghostline tem o recurso de colocar a imagem aonde ele quiser nos A4 


Sim — e esse detalhe é CRÍTICO.
O Ghostline não só divide a imagem em A4, ele permite posicionamento livre da arte dentro de cada página (inclusive fora do centro). Vou explicar exatamente como isso funciona e como você replica com precisão no Next.js.

🧠 COMO O GHOSTLINE FUNCIONA DE VERDADE

O comportamento real é:

A imagem existe em um plano contínuo (canvas global)
O A4 é apenas uma janela móvel que recorta esse plano

Ou seja:

❌ Não é “centralizar imagem no papel”

✅ É deslocar o papel sobre a imagem (ou vice-versa)

Isso permite:

Colocar o desenho no canto

Ajustar para evitar emendas ruins

Melhor encaixe em stencil

Controle milimétrico

🎯 CONCEITO-CHAVE (ESSENCIAL)
📐 Sistema de coordenadas global
Canvas Global (imagem completa em escala real)
┌──────────────────────────────┐
│                              │
│        IMAGEM REAL           │
│                              │
└──────────────────────────────┘

A4 = viewport móvel que você posiciona


Você move o offset X/Y do papel, não a imagem.

🔢 BASE MATEMÁTICA (SEM ERRO)
Conversão obrigatória
px = (mm / 25.4) * DPI

Dimensões A4 (300 DPI)
A4_WIDTH  = 2480px
A4_HEIGHT = 3508px

🧩 IMPLEMENTAÇÃO CORRETA (NEXT.JS)
Estado global
{
  imageWidthPx,
  imageHeightPx,
  pageWidthPx,
  pageHeightPx,
  offsetX, // deslocamento horizontal do papel
  offsetY  // deslocamento vertical do papel
}

🖱️ DRAG PARA POSICIONAR (IGUAL GHOSTLINE)
Movimento do papel
offsetX += deltaX
offsetY += deltaY


Limites:

offsetX = clamp(offsetX, 0, imageWidth - pageWidth)
offsetY = clamp(offsetY, 0, imageHeight - pageHeight)


✔️ Isso garante que o A4 nunca “saia” da imagem.

🧩 CORTE REAL PARA IMPRESSÃO
ctx.drawImage(
  image,
  offsetX,
  offsetY,
  pageWidth,
  pageHeight,
  0,
  0,
  pageWidth,
  pageHeight
)


Esse é exatamente o corte que será impresso.

🧩 MULTI-PÁGINAS COM OFFSET INICIAL

Ghostline faz isso:

Offset inicial manual

Depois continua o slicing automático

startX = offsetX + pageIndexX * effectivePageWidth
startY = offsetY + pageIndexY * effectivePageHeight


Com overlap aplicado:

effectivePageWidth = pageWidth - overlap
effectivePageHeight = pageHeight - overlap

🎨 VISUAL (UX IGUAL AO GHOSTLINE)
O usuário vê:

A imagem inteira

O retângulo A4 em cima

Pode arrastar o retângulo

Preview exato do que vai imprimir

UI essencial

🔲 Bounding box do A4

📏 Réguas em mm

🔍 Zoom real (1:1)

🧠 ERRO COMUM (NÃO FAÇA ISSO)

❌ Mover a imagem dentro do A4
❌ Centralizar automaticamente
❌ Usar transform: scale() CSS
❌ Calcular em viewport px

✔️ Sempre:

Canvas

Pixel físico

Coordenadas absolutas

🔥 DIFERENCIAL PRO

Você pode ir além do Ghostline:

Snap magnético por mm

Presets de posicionamento

Auto-suggest “melhor encaixe”

Visualização de emendas