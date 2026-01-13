/**
 * Funções de compressão de imagem no cliente
 * Para evitar erro 413 (payload muito grande)
 * 
 * ⚠️ IMPORTANTE: Stencils DEVEM permanecer em PNG (lossless)
 * JPEG corrompe imagens preto/branco com detalhes finos!
 */

/**
 * Comprime uma imagem base64 para um tamanho máximo
 * 
 * ⚠️ CORREÇÃO CRÍTICA: Usa PNG com redução de dimensões
 * Nunca converte para JPEG (causa corrupção de stencils!)
 * 
 * @param base64 - Imagem em base64 (data:image/...;base64,...)
 * @param maxSizeKB - Tamanho máximo em KB (padrão: 2500 = 2.5MB)
 * @returns Promise<string> - Imagem comprimida em base64 (sempre PNG)
 */
export async function compressImage(
  base64: string,
  maxSizeKB: number = 2500
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Calcular tamanho atual
      const currentSizeKB = Math.round((base64.length * 0.75) / 1024);

      console.log('[Compress] Tamanho atual:', currentSizeKB, 'KB');

      // Se já está abaixo do limite, retornar sem comprimir
      if (currentSizeKB <= maxSizeKB) {
        console.log('[Compress] Imagem já está abaixo do limite, não comprimindo');
        resolve(base64);
        return;
      }

      // Criar imagem
      const img = new Image();

      img.onload = () => {
        try {
          // Criar canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Erro ao criar contexto do canvas'));
            return;
          }

          // 🔧 CORREÇÃO: Calcular fator de redução baseado no tamanho
          // Se precisa reduzir de 5MB para 2.5MB, reduzir dimensões em sqrt(2) ≈ 1.41
          const reductionFactor = Math.sqrt(maxSizeKB / currentSizeKB);
          
          // Garantir redução mínima de 10% para ter efeito
          const effectiveFactor = Math.min(reductionFactor, 0.9);
          
          let targetWidth = Math.floor(img.width * effectiveFactor);
          let targetHeight = Math.floor(img.height * effectiveFactor);
          
          // Garantir dimensões mínimas (não menor que 800px no menor lado)
          const minDimension = 800;
          if (targetWidth < minDimension && targetHeight < minDimension) {
            const scale = minDimension / Math.min(targetWidth, targetHeight);
            targetWidth = Math.floor(targetWidth * scale);
            targetHeight = Math.floor(targetHeight * scale);
          }

          console.log('[Compress] Redimensionando:', {
            original: `${img.width}x${img.height}`,
            novo: `${targetWidth}x${targetHeight}`,
            fator: effectiveFactor.toFixed(2)
          });

          // Configurar canvas
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Desenhar imagem redimensionada com suavização
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // 🔧 CORREÇÃO CRÍTICA: SEMPRE usar PNG para stencils
          // PNG é lossless e preserva detalhes preto/branco
          const compressed = canvas.toDataURL('image/png');
          const compressedSizeKB = Math.round((compressed.length * 0.75) / 1024);

          console.log('[Compress] ✅ Compressão PNG concluída:', compressedSizeKB, 'KB');
          
          // Se ainda muito grande, tentar reduzir mais (recursivo)
          if (compressedSizeKB > maxSizeKB && targetWidth > minDimension && targetHeight > minDimension) {
            console.log('[Compress] Ainda grande, tentando reduzir mais...');
            // Chamar recursivamente com a imagem já reduzida
            compressImage(compressed, maxSizeKB).then(resolve).catch(reject);
          } else {
            resolve(compressed);
          }

        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Erro ao carregar imagem'));
      };

      img.src = base64;

    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Comprime apenas se necessário (wrapper simplificado)
 * @param base64 - Imagem em base64
 * @returns Promise<string> - Imagem comprimida (ou original se já pequena)
 */
export async function compressIfNeeded(base64: string): Promise<string> {
  const sizeKB = Math.round((base64.length * 0.75) / 1024);

  // 🔧 CORREÇÃO: Limite mais conservador (2.5MB em vez de 3MB)
  // Railway/Vercel têm limite de ~4.5MB, mas deixamos margem para headers
  if (sizeKB > 2500) {
    console.log('[Compress] Imagem muito grande (' + sizeKB + 'KB), comprimindo...');
    return await compressImage(base64, 2500);
  }

  return base64;
}
