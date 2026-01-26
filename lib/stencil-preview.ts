/**
 * Stencil Preview Processor
 * Aplica blur, marca d'água e resolução capada para usuários Free
 *
 * Estratégia anti-screenshot:
 * 1. Blur Gaussiano forte (inutiliza para impressão)
 * 2. Marca d'água agressiva e dinâmica (texto repetido, rotacionado, com ID)
 * 3. Resolução capada (512px - inútil para stencil real)
 */

import sharp from 'sharp';

interface PreviewOptions {
  userEmail?: string;
  userId?: string;
}

/**
 * Aplica todas as proteções de preview no stencil
 * Retorna imagem base64 degradada (inútil para uso real)
 */
export async function applyPreviewProtection(
  base64Image: string,
  options: PreviewOptions = {}
): Promise<string> {
  // Limpar prefixo data URI
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
  const imageBuffer = Buffer.from(cleanBase64, 'base64');

  // 1. Reduzir resolução para 512px (inútil para impressão)
  let processed = sharp(imageBuffer)
    .resize(512, 512, {
      fit: 'inside',
      withoutEnlargement: false, // Força downscale mesmo se menor
    });

  // 2. Aplicar blur leve (sigma 3 = visível mas inutilizável para impressão)
  // A proteção real vem da resolução 512px + watermark agressiva
  processed = processed.blur(3);

  // 3. Converter para buffer para adicionar watermark
  const blurredBuffer = await processed.png().toBuffer();

  // 4. Criar overlay de marca d'água via SVG
  const { width, height } = await sharp(blurredBuffer).metadata();
  const w = width || 512;
  const h = height || 512;

  const watermarkSvg = generateWatermarkSvg(w, h, options);

  // 5. Compor imagem com watermark
  const finalBuffer = await sharp(blurredBuffer)
    .composite([
      {
        input: Buffer.from(watermarkSvg),
        top: 0,
        left: 0,
      }
    ])
    .png({ quality: 60, compressionLevel: 9 })
    .toBuffer();

  return `data:image/png;base64,${finalBuffer.toString('base64')}`;
}

/**
 * Gera SVG de marca d'água agressiva
 * - Texto grande repetido
 * - Rotacionado em diagonal
 * - Opacidade variável
 * - Inclui identificador do usuário
 */
function generateWatermarkSvg(
  width: number,
  height: number,
  options: PreviewOptions
): string {
  const userIdentifier = options.userEmail
    ? maskEmail(options.userEmail)
    : options.userId
      ? `ID:${options.userId.substring(0, 8)}`
      : '';

  // Textos de marca d'água
  const mainText = 'StencilFlow';
  const subText = 'FREE PREVIEW';
  const idText = userIdentifier;

  // Gerar múltiplas linhas de texto rotacionado
  const lines: string[] = [];
  const fontSize = Math.max(16, Math.floor(width / 12));
  const smallFontSize = Math.max(10, Math.floor(fontSize * 0.6));
  const lineSpacing = fontSize * 3;

  // Cobrir toda a imagem com texto diagonal
  for (let y = -height; y < height * 2; y += lineSpacing) {
    for (let x = -width; x < width * 2; x += fontSize * 10) {
      const opacity = 0.15 + Math.random() * 0.15; // 15-30% opacidade

      lines.push(
        `<text x="${x}" y="${y}" font-size="${fontSize}" fill="black" opacity="${opacity.toFixed(2)}" font-family="Arial, sans-serif" font-weight="bold" transform="rotate(-35, ${x}, ${y})">${mainText}</text>`
      );

      lines.push(
        `<text x="${x + fontSize * 2}" y="${y + fontSize * 1.2}" font-size="${smallFontSize}" fill="black" opacity="${(opacity + 0.1).toFixed(2)}" font-family="Arial, sans-serif" transform="rotate(-35, ${x + fontSize * 2}, ${y + fontSize * 1.2})">${subText}</text>`
      );

      if (idText) {
        lines.push(
          `<text x="${x + fontSize * 1}" y="${y + fontSize * 2.2}" font-size="${Math.floor(smallFontSize * 0.8)}" fill="black" opacity="${(opacity * 0.8).toFixed(2)}" font-family="monospace" transform="rotate(-35, ${x + fontSize}, ${y + fontSize * 2.2})">${idText}</text>`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${lines.join('')}</svg>`;
}

/**
 * Mascara email para exibição na watermark
 * ex: "joao@email.com" → "jo***@em***.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email.substring(0, 4) + '***';

  const maskedLocal = local.substring(0, 2) + '***';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts[0].substring(0, 2) + '***.' + (domainParts[domainParts.length - 1] || 'com');

  return `${maskedLocal}@${maskedDomain}`;
}
