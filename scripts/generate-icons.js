/**
 * Script para gerar ícones PWA básicos (placeholder)
 * Para produção, substitua por ícones profissionais
 */

const fs = require('fs');
const path = require('path');

// Criar SVG para cada tamanho
function createIconSVG(size) {
  const padding = size * 0.2; // 20% de margem
  const iconSize = size - padding * 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#000000"/>

  <!-- Emerald gradient overlay -->
  <rect width="${size}" height="${size}" fill="url(#grad)" opacity="0.1"/>

  <!-- Icon -->
  <g transform="translate(${padding}, ${padding})">
    <path d="M${iconSize/2} ${iconSize*0.15} L${iconSize*0.2} ${iconSize*0.35} V${iconSize*0.65} L${iconSize/2} ${iconSize*0.85} L${iconSize*0.8} ${iconSize*0.65} V${iconSize*0.35} Z"
          fill="none"
          stroke="#10b981"
          stroke-width="${size/20}"
          stroke-linecap="round"
          stroke-linejoin="round"/>

    <path d="M${iconSize/2} ${iconSize/2} V${iconSize*0.85}"
          stroke="#10b981"
          stroke-width="${size/20}"
          stroke-linecap="round"/>

    <path d="M${iconSize*0.2} ${iconSize*0.35} L${iconSize/2} ${iconSize/2} L${iconSize*0.8} ${iconSize*0.35}"
          stroke="#10b981"
          stroke-width="${size/20}"
          stroke-linecap="round"
          stroke-linejoin="round"/>

    <circle cx="${iconSize/2}" cy="${iconSize*0.35}" r="${size/30}" fill="#10b981"/>
    <circle cx="${iconSize*0.2}" cy="${iconSize/2}" r="${size/30}" fill="#10b981"/>
    <circle cx="${iconSize*0.8}" cy="${iconSize/2}" r="${size/30}" fill="#10b981"/>
  </g>

  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#000000"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
  </defs>
</svg>`;
}

// Criar ícones
const publicDir = path.join(__dirname, '..', 'public');

// icon-192.png (será SVG por enquanto)
fs.writeFileSync(
  path.join(publicDir, 'icon-192.png'),
  createIconSVG(192)
);

// icon-512.png (será SVG por enquanto)
fs.writeFileSync(
  path.join(publicDir, 'icon-512.png'),
  createIconSVG(512)
);

// Versões maskable (com mais padding)
function createMaskableSVG(size) {
  const padding = size * 0.3; // 30% de margem para safe zone
  const iconSize = size - padding * 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background sólido -->
  <rect width="${size}" height="${size}" fill="#000000"/>

  <!-- Icon menor (safe zone) -->
  <g transform="translate(${padding}, ${padding})">
    <path d="M${iconSize/2} ${iconSize*0.15} L${iconSize*0.2} ${iconSize*0.35} V${iconSize*0.65} L${iconSize/2} ${iconSize*0.85} L${iconSize*0.8} ${iconSize*0.65} V${iconSize*0.35} Z"
          fill="none"
          stroke="#10b981"
          stroke-width="${size/25}"
          stroke-linecap="round"
          stroke-linejoin="round"/>

    <path d="M${iconSize/2} ${iconSize/2} V${iconSize*0.85}"
          stroke="#10b981"
          stroke-width="${size/25}"
          stroke-linecap="round"/>

    <circle cx="${iconSize/2}" cy="${iconSize*0.35}" r="${size/40}" fill="#10b981"/>
    <circle cx="${iconSize*0.2}" cy="${iconSize/2}" r="${size/40}" fill="#10b981"/>
    <circle cx="${iconSize*0.8}" cy="${iconSize/2}" r="${size/40}" fill="#10b981"/>
  </g>
</svg>`;
}

fs.writeFileSync(
  path.join(publicDir, 'icon-192-maskable.png'),
  createMaskableSVG(192)
);

fs.writeFileSync(
  path.join(publicDir, 'icon-512-maskable.png'),
  createMaskableSVG(512)
);

console.log('✅ Ícones placeholder criados com sucesso!');
console.log('⚠️  ATENÇÃO: Estes são ícones SVG placeholder.');
console.log('📝 Para produção, crie PNGs reais seguindo o guia em public/CRIAR_ICONES.md');
