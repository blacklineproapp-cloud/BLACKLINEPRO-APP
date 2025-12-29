/**
 * Funções de compressão de imagem no cliente
 * Para evitar erro 413 (payload muito grande)
 */

/**
 * Comprime uma imagem base64 para um tamanho máximo
 * @param base64 - Imagem em base64 (data:image/...;base64,...)
 * @param maxSizeKB - Tamanho máximo em KB (padrão: 3000 = 3MB)
 * @param quality - Qualidade inicial (0.0-1.0, padrão: 0.9)
 * @returns Promise<string> - Imagem comprimida em base64
 */
export async function compressImage(
  base64: string,
  maxSizeKB: number = 3000,
  quality: number = 0.9
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

          // Calcular nova dimensão (reduzir proporcionalmente)
          const scaleFactor = Math.sqrt(maxSizeKB / currentSizeKB);
          const newWidth = Math.floor(img.width * scaleFactor);
          const newHeight = Math.floor(img.height * scaleFactor);

          console.log('[Compress] Redimensionando:', {
            original: `${img.width}x${img.height}`,
            novo: `${newWidth}x${newHeight}`,
            scaleFactor: scaleFactor.toFixed(2)
          });

          // Configurar canvas
          canvas.width = newWidth;
          canvas.height = newHeight;

          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Tentar comprimir com qualidade decrescente até atingir o tamanho
          let currentQuality = quality;
          let attempts = 0;
          const maxAttempts = 5;

          const tryCompress = (): string => {
            attempts++;
            const compressed = canvas.toDataURL('image/png', currentQuality);
            const compressedSizeKB = Math.round((compressed.length * 0.75) / 1024);

            console.log('[Compress] Tentativa', attempts, '- Qualidade:', currentQuality.toFixed(2), '- Tamanho:', compressedSizeKB, 'KB');

            // Se atingiu o tamanho ou máximo de tentativas, retornar
            if (compressedSizeKB <= maxSizeKB || attempts >= maxAttempts) {
              console.log('[Compress] ✅ Compressão concluída:', compressedSizeKB, 'KB');
              return compressed;
            }

            // Reduzir qualidade e tentar novamente
            currentQuality -= 0.1;
            if (currentQuality < 0.5) currentQuality = 0.5; // Mínimo de qualidade
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

  // Limite de 3MB (Vercel aceita até 4.5MB, mas deixamos margem)
  if (sizeKB > 3000) {
    console.log('[Compress] Imagem muito grande (' + sizeKB + 'KB), comprimindo...');
    return await compressImage(base64, 3000);
  }

  return base64;
}
