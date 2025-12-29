# 🔬 Pesquisa Técnica: Modo STENCIL FLOW (Processamento Clássico)

## 🎯 OBJETIVO

Criar um modo de processamento **100% determinístico** que converta imagens em stencils usando **algoritmos clássicos** (não IA generativa), garantindo:
- ✅ Fidelidade total à imagem original
- ✅ Linhas limpas e fechadas
- ✅ Espessura consistente
- ✅ Resultado previsível e repetível
- ✅ Processamento rápido e local

---

## 📚 FUNDAMENTOS TEÓRICOS

### 1. Edge Detection (Detecção de Bordas)

**O que é:** Identificar mudanças abruptas de intensidade (bordas) na imagem.

#### 🔹 Canny Edge Detection (MELHOR para stencils)

**Como funciona:**
1. **Gaussian blur** → Remove ruído
2. **Gradient calculation** (Sobel) → Detecta mudanças de intensidade
3. **Non-maximum suppression** → Afina bordas (1 pixel)
4. **Double threshold** → Classifica bordas (fortes vs fracas)
5. **Hysteresis tracking** → Conecta bordas fortes com fracas

**Parâmetros críticos:**
```javascript
{
  lowThreshold: 50,   // Bordas fracas (threshold baixo)
  highThreshold: 150, // Bordas fortes (threshold alto)
  sigma: 1.4,         // Gaussian blur (remoção de ruído)
}
```

**Por que é o melhor:**
- ✅ Bordas finas (1px)
- ✅ Conecta bordas quebradas
- ✅ Elimina ruído
- ✅ Padrão da indústria

**Limitações:**
- ❌ Não funciona bem com imagens muito ruidosas
- ❌ Precisa ajuste manual de thresholds

---

#### 🔹 Sobel Edge Detection (alternativa mais simples)

**Como funciona:**
- Usa kernels de convolução para detectar gradientes horizontal e vertical
- Combina os dois para obter magnitude do gradiente

**Kernels Sobel:**
```
Horizontal:        Vertical:
[-1  0  1]        [-1 -2 -1]
[-2  0  2]        [ 0  0  0]
[-1  0  1]        [ 1  2  1]
```

**Por que usar:**
- ✅ Mais simples que Canny
- ✅ Mais rápido
- ✅ Bom para imagens com bordas fortes

**Limitações:**
- ❌ Bordas mais grossas
- ❌ Mais sensível a ruído
- ❌ Não conecta bordas quebradas

---

#### 🔹 Laplacian Edge Detection

**Como funciona:**
- Detecta mudanças de segunda derivada (zero-crossings)
- Kernel único:
```
Laplacian Kernel:
[ 0 -1  0]
[-1  4 -1]
[ 0 -1  0]

Ou versão mais forte:
[-1 -1 -1]
[-1  8 -1]
[-1 -1 -1]
```

**Quando usar:**
- Para detectar bordas em todas as direções simultaneamente
- Imagens com bordas bem definidas

**Limitações:**
- ❌ MUI sensível a ruído
- ❌ Sempre precisa de blur antes

---

### 2. Morphological Operations (Operações Morfológicas)

**O que é:** Operações baseadas em formas (estruturas) para processar imagens binárias.

#### 🔹 Dilate (Dilatação)

**O que faz:**
- ENGROSSA linhas brancas
- PREENCHE pequenos buracos
- CONECTA elementos próximos

**Como funciona:**
```
Pixel se torna branco se QUALQUER vizinho for branco
```

**Kernel típico (3x3):**
```
[1 1 1]
[1 1 1]
[1 1 1]
```

**Quando usar:**
- Linhas muito finas (engrosar)
- Bordas quebradas (conectar)
- Gaps pequenos (fechar)

---

#### 🔹 Erode (Erosão)

**O que faz:**
- AFINA linhas brancas
- REMOVE ruído pequeno
- SEPARA elementos conectados

**Como funciona:**
```
Pixel se torna branco APENAS se TODOS vizinhos forem brancos
```

**Quando usar:**
- Linhas muito grossas (afinar)
- Remover pontos isolados
- Limpar ruído

---

#### 🔹 Opening (Abertura = Erode + Dilate)

**O que faz:**
- Remove ruído pequeno
- Preserva forma geral

**Quando usar:**
- Limpar stencil de pontos isolados
- Manter linhas principais

---

#### 🔹 Closing (Fechamento = Dilate + Erode)

**O que faz:**
- Fecha pequenos buracos
- Conecta linhas quebradas
- Preserva forma geral

**Quando usar:**
- Fechar gaps em linhas
- Suavizar contornos
- Unir elementos próximos

---

### 3. Threshold (Binarização)

**O que é:** Converter imagem grayscale para preto/branco puro.

#### 🔹 Global Threshold

**Como funciona:**
```javascript
if (pixel > threshold) {
  pixel = 255; // Branco
} else {
  pixel = 0;   // Preto
}
```

**Quando usar:**
- Imagem com iluminação uniforme
- Contraste alto

**Limitações:**
- ❌ Não funciona bem com iluminação variável

---

#### 🔹 Otsu's Threshold (automático)

**Como funciona:**
- Calcula threshold ÓTIMO automaticamente
- Maximiza variância entre classes (preto vs branco)
- Baseado em análise de histograma

**Vantagens:**
- ✅ Totalmente automático
- ✅ Funciona bem em maioria dos casos
- ✅ Robusto

**Quando usar:**
- Quando você NÃO sabe o threshold ideal
- Imagens com distribuição bimodal (dois picos no histograma)

---

#### 🔹 Adaptive Threshold (local)

**Como funciona:**
- Calcula threshold diferente para CADA região da imagem
- Baseado na média ou gaussiana da vizinhança

**Tipos:**
```javascript
// Mean Adaptive
threshold(x,y) = mean(neighborhood) - C

// Gaussian Adaptive
threshold(x,y) = gaussianMean(neighborhood) - C
```

**Vantagens:**
- ✅ Funciona com iluminação NÃO uniforme
- ✅ Ideal para fotos reais (sombras, variação de luz)

**Quando usar:**
- Imagens com iluminação variável
- Fundos complexos
- Fotos de tatuagens (comum ter variação de luz)

---

### 4. Noise Reduction (Redução de Ruído)

#### 🔹 Gaussian Blur

**O que faz:**
- Suaviza imagem
- Remove ruído de alta frequência

**Kernel (exemplo 3x3):**
```
[1  2  1]    1
[2  4  2] × ---
[1  2  1]   16
```

**Parâmetro crítico:**
- `sigma`: quanto maior, mais blur (típico: 0.5-2.0)

**Quando usar:**
- ANTES de edge detection (sempre!)
- Para remover grãos e texturas de pele

**Limitações:**
- ❌ Borra bordas também (tradeoff)

---

#### 🔹 Bilateral Filter

**O que faz:**
- Suaviza imagem MAS preserva bordas
- "Blur inteligente"

**Como funciona:**
- Combina proximidade espacial + similaridade de cor
- Pixels similares influenciam mais
- Pixels diferentes (bordas) influenciam menos

**Parâmetros:**
```javascript
{
  spatialSigma: 10,  // Distância espacial
  colorSigma: 50,    // Diferença de cor
}
```

**Vantagens:**
- ✅ Remove ruído SEM borrar bordas
- ✅ Ideal para pré-processamento de stencils

**Quando usar:**
- Antes de edge detection
- Quando você precisa preservar bordas nítidas

**Limitações:**
- ❌ Mais lento que Gaussian
- ❌ Mais complexo de implementar

---

#### 🔹 Median Filter

**O que faz:**
- Substitui cada pixel pela MEDIANA dos vizinhos
- Excelente para remover "salt and pepper noise" (pontos isolados)

**Quando usar:**
- Imagens com pontos brancos/pretos isolados
- Pós-processamento de stencil (limpar)

---

### 5. Contour Detection & Simplification

#### 🔹 Contour Detection

**O que é:**
- Encontrar sequências de pontos conectados que formam bordas
- Gera lista de contornos (cada um é um array de pontos)

**Algoritmos:**
- Suzuki-Abe (padrão em OpenCV)
- Border following

**Output:**
```javascript
[
  [ {x:10,y:20}, {x:11,y:20}, ... ], // Contorno 1
  [ {x:50,y:30}, {x:51,y:31}, ... ], // Contorno 2
]
```

---

#### 🔹 Contour Simplification (Douglas-Peucker)

**O que faz:**
- Reduz número de pontos em um contorno
- Preserva forma geral
- Remove "zig-zag" desnecessário

**Como funciona:**
1. Traça linha entre primeiro e último ponto
2. Encontra ponto mais distante dessa linha
3. Se distância > epsilon, divide em 2 segmentos
4. Repete recursivamente

**Parâmetro crítico:**
- `epsilon`: tolerância (quanto maior, mais simplificação)
  - 0.001: quase nenhuma simplificação
  - 0.01: simplificação moderada
  - 0.1: simplificação agressiva

**Vantagens:**
- ✅ Linhas mais suaves
- ✅ Menos pontos (arquivo menor)
- ✅ Melhor para impressão

---

## 🏗️ PIPELINE PROPOSTO (Modo STENCIL FLOW)

### Pipeline Completo (Passo a Passo)

```
INPUT: Imagem RGB
  ↓
[1] Grayscale Conversion
  ↓ (imagem em tons de cinza)

[2] Histogram Equalization (normalizar contraste)
  ↓ (contraste uniforme)

[3] Bilateral Filter (reduzir ruído, preservar bordas)
  ↓ (imagem suave, bordas nítidas)

[4] Canny Edge Detection
  ↓ (bordas detectadas - linhas brancas em fundo preto)

[5] Morphological Closing (fechar gaps)
  ↓ (linhas conectadas)

[6] Morphological Dilate (engrosar linhas)
  ↓ (linhas mais visíveis)

[7] Contour Detection
  ↓ (lista de contornos)

[8] Contour Simplification (Douglas-Peucker)
  ↓ (contornos suavizados)

[9] Render to Canvas (300 DPI)
  ↓
OUTPUT: Stencil PNG (preto puro em branco puro)
```

---

### Parâmetros Iniciais Sugeridos

```javascript
const STENCILFLOW_DEFAULTS = {
  // Noise reduction
  bilateralSigma: { spatial: 10, color: 50 },

  // Edge detection
  cannyThreshold: { low: 50, high: 150 },
  cannySigma: 1.4,

  // Morphology
  closingKernelSize: 3,  // Fechar gaps
  dilateIterations: 1,   // Engrosar linhas (1-2x)

  // Contour
  epsilonFactor: 0.005,  // 0.5% do perímetro

  // Output
  dpi: 300,
  backgroundColor: '#FFFFFF',
  lineColor: '#000000',
};
```

---

## 🛠️ IMPLEMENTAÇÃO EM SHARP

Sharp suporta:
- ✅ Grayscale conversion
- ✅ Normalize (histogram equalization)
- ✅ Blur (Gaussian)
- ✅ Convolve (custom kernels → Sobel, Laplacian)
- ✅ Threshold
- ✅ Negate (inverter cores)

Sharp **NÃO** suporta nativamente:
- ❌ Bilateral filter
- ❌ Canny edge detection
- ❌ Morphological operations (dilate, erode, etc)
- ❌ Contour detection

---

## 🔬 OPÇÕES DE IMPLEMENTAÇÃO

### Opção 1: Sharp + Custom Kernels (Limitado)

**Pros:**
- ✅ Já temos Sharp
- ✅ Rápido (C++ bindings)

**Cons:**
- ❌ Não tem Canny
- ❌ Não tem morphology
- ❌ Não tem bilateral
- ❌ Só tem operações básicas

**Viabilidade:** ⚠️ LIMITADO - Não consegue fazer pipeline completo

---

### Opção 2: OpenCV.js (WebAssembly)

**Pros:**
- ✅ TEM TUDO (Canny, morphology, bilateral, contours)
- ✅ Mesma API do OpenCV Python/C++
- ✅ Roda no browser E no servidor (Node.js)
- ✅ Extremamente otimizado

**Cons:**
- ❌ Bundle grande (~8MB)
- ❌ Precisa carregar WASM
- ❌ Curva de aprendizado

**Viabilidade:** ✅ IDEAL - Tem tudo que precisamos

---

### Opção 3: Sharp + Jimp (híbrido)

**Pros:**
- ✅ Jimp tem algumas operações morfológicas
- ✅ Pure JavaScript (sem WASM)

**Cons:**
- ❌ Jimp é LENTO (JS puro)
- ❌ Jimp não tem Canny
- ❌ API limitada

**Viabilidade:** ⚠️ NÃO RECOMENDADO - Lento e incompleto

---

### Opção 4: Python Microservice (OpenCV nativo)

**Pros:**
- ✅ OpenCV completo (cv2)
- ✅ MUITO rápido (C++)
- ✅ Controle total

**Cons:**
- ❌ Precisa deploy separado
- ❌ Adiciona latência de rede
- ❌ Mais complexo

**Viabilidade:** ✅ VIÁVEL - Mas adiciona complexidade

---

## 🎯 RECOMENDAÇÃO

### **OpenCV.js (WebAssembly)**

**Por quê:**
1. ✅ Tem TODAS as funções necessárias
2. ✅ Performance excelente (WASM)
3. ✅ Roda no servidor (Next.js API routes)
4. ✅ Mesma qualidade de apps nativos
5. ✅ Comunidade grande, muita documentação

**Como implementar:**
```bash
npm install opencv-ts
# ou
npm install @techstark/opencv-js
```

**Uso básico:**
```javascript
import cv from '@techstark/opencv-js';

// Load image
const src = cv.imread(imageElement);

// Grayscale
cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

// Bilateral filter
cv.bilateralFilter(gray, filtered, 9, 75, 75);

// Canny edge
cv.Canny(filtered, edges, 50, 150);

// Morphology
const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
cv.dilate(closed, dilated, kernel, new cv.Point(-1, -1), 1);

// Contours
const contours = new cv.MatVector();
const hierarchy = new cv.Mat();
cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

// Simplify contours
for (let i = 0; i < contours.size(); i++) {
  const approx = new cv.Mat();
  const perimeter = cv.arcLength(contours.get(i), true);
  cv.approxPolyDP(contours.get(i), approx, 0.005 * perimeter, true);
  // Draw simplified contour
}

// Output
cv.imwrite('output.png', result);
```

---

## 📋 PRÓXIMOS PASSOS

### Fase 1: Pesquisa & Experimentação
- [ ] Instalar OpenCV.js
- [ ] Criar protótipo isolado (playground)
- [ ] Testar diferentes parâmetros
- [ ] Comparar resultados com Ghostline/outros apps
- [ ] Documentar parâmetros ótimos

### Fase 2: Implementação
- [ ] Criar API route `/api/tools/stencilflow`
- [ ] Implementar pipeline completo
- [ ] Adicionar controles de parâmetros (UI)
- [ ] Testes com diferentes tipos de imagem

### Fase 3: Refinamento
- [ ] A/B testing com usuários
- [ ] Ajuste fino de parâmetros
- [ ] Otimização de performance
- [ ] Documentação para usuários

---

## 🔗 REFERÊNCIAS TÉCNICAS

### Papers & Artigos
- [Canny Edge Detection (1986)](https://ieeexplore.ieee.org/document/4767851) - Paper original
- [Otsu's Threshold (1979)](https://ieeexplore.ieee.org/document/4310076) - Método automático
- [Douglas-Peucker Algorithm (1973)](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm)

### Tutoriais OpenCV
- [OpenCV.js Tutorials](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [Edge Detection](https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html)
- [Morphological Transformations](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphological_ops.html)
- [Contours](https://docs.opencv.org/4.x/d4/d73/tutorial_py_contours_begin.html)

### Livros
- "Learning OpenCV 4" - Gary Bradski
- "Digital Image Processing" - Rafael Gonzalez

---

## 💡 INSIGHTS IMPORTANTES

1. **Não existe "configuração mágica"**
   - Cada tipo de imagem (retrato, objeto, tattoo flash, etc) pode precisar de parâmetros diferentes
   - Precisamos permitir ajuste manual OU criar presets

2. **Pipeline é iterativo**
   - Testar → Ajustar → Testar → Ajustar
   - Comparar com referências (Ghostline, etc)

3. **Performance importa**
   - OpenCV.js é rápido, mas carregar WASM tem custo inicial
   - Cache do WASM é crítico
   - Processar no servidor (API route) é melhor que client-side

4. **Fidelidade é rei**
   - NUNCA inventar linhas
   - NUNCA distorcer anatomia
   - Melhor ter menos linhas do que linhas erradas

---

## ✅ DECISÃO FINAL

**Implementar?**
- [ ] SIM - Criar modo STENCIL FLOW com OpenCV.js
- [ ] NÃO - Manter apenas modos com Gemini
- [ ] TALVEZ - Fazer protótipo primeiro

**Substituir ou Adicionar?**
- [ ] SUBSTITUIR modo LINHAS por STENCIL FLOW
- [ ] ADICIONAR STENCIL FLOW como 3º modo
- [ ] CRIAR versão híbrida (Gemini + pós-processamento OpenCV)

---

**🤔 Sua decisão?**
