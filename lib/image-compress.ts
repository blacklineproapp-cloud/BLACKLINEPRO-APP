/**
 * Funções de compressão de imagem no cliente
 * Para evitar erro 413 (payload muito grande)
 */

/**
 * Comprime uma imagem base64 para um tamanho máximo
 * @param base64 - Imagem em base64 (data:image/...;base64,...)
 * @param maxSizeKB - Tamanho máximo em KB (padrão: 2500 = 2.5MB)
 * @param quality - Qualidade inicial (0.0-1.0, padrão: 0.85)
 * @returns Promise<string> - Imagem comprimida em base64
 */
export async function compressImage(
  base64: string,
  maxSizeKB: number = 2500,
  quality: number = 0.85
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

          // 🔧 CORREÇÃO: Reduzir dimensões AGRESSIVAMENTE se imagem muito grande
          let targetWidth = img.width;
          let targetHeight = img.height;

          // Se maior que 4MB, reduzir dimensões primeiro
          if (currentSizeKB > 4000) {
            const reductionFactor = Math.sqrt(2500 / currentSizeKB); // Reduzir para ~2.5MB
            targetWidth = Math.floor(img.width * reductionFactor);
            targetHeight = Math.floor(img.height * reductionFactor);
            
            console.log('[Compress] 🔥 Imagem MUITO grande, reduzindo dimensões:', {
              original: `${img.width}x${img.height}`,
              novo: `${targetWidth}x${targetHeight}`,
              fator: reductionFactor.toFixed(2)
            });
          }

          // Configurar canvas
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Desenhar imagem redimensionada com suavização
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // 🔧 CORREÇÃO CRÍTICA: Usar JPEG em vez de PNG para compressão real
          // PNG ignora o parâmetro quality!
          let currentQuality = quality;
          let attempts = 0;
          const maxAttempts = 8;

          const tryCompress = (): string => {
            attempts++;
            
            // USAR JPEG para compressão (PNG não comprime!)
            const compressed = canvas.toDataURL('image/jpeg', currentQuality);
            const compressedSizeKB = Math.round((compressed.length * 0.75) / 1024);

            console.log('[Compress] Tentativa', attempts, '- Qualidade:', currentQuality.toFixed(2), '- Tamanho:', compressedSizeKB, 'KB');

            // Se atingiu o tamanho ou máximo de tentativas, retornar
            if (compressedSizeKB <= maxSizeKB || attempts >= maxAttempts) {
              console.log('[Compress] ✅ Compressão concluída:', compressedSizeKB, 'KB');
              return compressed;
            }

            // Reduzir qualidade mais agressivamente
            currentQuality -= 0.15;
            if (currentQuality < 0.3) currentQuality = 0.3; // Mínimo de qualidade
            return tryCompress();
          };

          const result = tryCompress();
          resolve(result);

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
    return await compressImage(base64, 2500, 0.85);
  }

  return base64;
}
