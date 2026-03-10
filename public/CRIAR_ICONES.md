# 📱 COMO CRIAR ÍCONES PWA

O arquivo `icon.svg` é um placeholder. Para produção, você precisa criar ícones PNG reais.

## 🎨 OPÇÃO 1: Usar um Gerador Online (Recomendado)

### **PWA Asset Generator:**
1. Acesse: https://www.pwabuilder.com/imageGenerator
2. Faça upload do seu logo (PNG ou SVG)
3. Clique em "Generate"
4. Baixe o ZIP com todos os ícones
5. Copie os arquivos para a pasta `public/`

### **RealFaviconGenerator:**
1. Acesse: https://realfavicongenerator.net/
2. Upload do logo
3. Ajuste as configurações PWA
4. Baixe o pacote
5. Copie os ícones para `public/`

---

## 🖼️ OPÇÃO 2: Criar Manualmente com Figma/Photoshop

### **Especificações dos Ícones:**

#### **icon-192.png** (Android)
- Tamanho: 192x192px
- Formato: PNG
- Safe zone: 40px de margem
- Fundo: #000000 (preto)
- Logo: Centralizado, ~112x112px
- Cor principal: #6366F1 (indigo)

#### **icon-512.png** (Android / Splash)
- Tamanho: 512x512px
- Formato: PNG
- Safe zone: 100px de margem
- Fundo: #000000 (preto)
- Logo: Centralizado, ~312x312px
- Cor principal: #6366F1 (indigo)

#### **icon-192-maskable.png** (Adaptive Icon)
- Tamanho: 192x192px
- Formato: PNG
- Safe zone: 48px de margem (25%)
- Fundo: Sólido #000000
- Logo: ~96x96px (50% do tamanho)

#### **icon-512-maskable.png** (Adaptive Icon)
- Tamanho: 512x512px
- Formato: PNG
- Safe zone: 128px de margem (25%)
- Fundo: Sólido #000000
- Logo: ~256x256px (50% do tamanho)

---

## 🎯 OPÇÃO 3: Usar ImageMagick (CLI)

Se você tem um logo SVG ou PNG de alta resolução:

```bash
# Instalar ImageMagick (Windows)
choco install imagemagick

# Ou (macOS)
brew install imagemagick

# Converter SVG para PNG 192x192
magick convert -background black -resize 192x192 icon.svg public/icon-192.png

# Converter SVG para PNG 512x512
magick convert -background black -resize 512x512 icon.svg public/icon-512.png

# Criar versões maskable (com padding)
magick convert -background black -gravity center -extent 192x192 -resize 144x144 icon.svg public/icon-192-maskable.png

magick convert -background black -gravity center -extent 512x512 -resize 384x384 icon.svg public/icon-512-maskable.png
```

---

## ✅ CHECKLIST

Depois de criar os ícones, verificar:

- [ ] `icon-192.png` existe em `public/`
- [ ] `icon-512.png` existe em `public/`
- [ ] `icon-192-maskable.png` existe em `public/`
- [ ] `icon-512-maskable.png` existe em `public/`
- [ ] Ícones têm fundo opaco (não transparente)
- [ ] Logo está centralizado
- [ ] Safe zones respeitadas
- [ ] Formato PNG (não JPEG)

---

## 📱 TESTAR ÍCONES

### **Chrome DevTools:**
1. Abrir DevTools (F12)
2. Application → Manifest
3. Ver preview dos ícones
4. Verificar se carregam corretamente

### **Lighthouse:**
1. DevTools → Lighthouse
2. Run audit (PWA)
3. Verificar se ícones passam

### **Instalar no Android:**
1. Abrir app no Chrome mobile
2. Menu → "Adicionar à tela inicial"
3. Verificar ícone na home screen

---

## 🎨 DESIGN RECOMENDADO

Para o StencilFlow, sugiro:

**Conceito:** Logo de stencil/tattoo minimalista
**Cores:**
- Fundo: #000000 (preto)
- Principal: #6366F1 (indigo)
- Acento: #ffffff (branco)

**Estilo:**
- Flat design (sem gradientes complexos)
- Alto contraste
- Simples e reconhecível em tamanhos pequenos

**Exemplo visual:**
```
┌──────────────────┐
│                  │
│    ╱╲  ╱╲        │
│   ╱  ╲╱  ╲       │  Logo stencil em emerald
│  ╱   ╱╲   ╲      │  Fundo preto
│ ╱___╱  ╲___╲     │
│                  │
└──────────────────┘
```

---

## 🚀 DEPOIS DE CRIAR

Não esqueça de:

1. **Substituir** os ícones placeholder
2. **Testar** em dispositivos reais
3. **Verificar** no Lighthouse
4. **Atualizar** screenshots (se houver)
5. **Fazer** novo build: `npm run build`

---

**Dica:** Use https://maskable.app/ para testar ícones maskable
