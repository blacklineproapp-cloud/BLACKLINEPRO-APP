/**
 * Funções de compressão de imagem no cliente
 * Para evitar erro 413 (payload muito grande)
 * 
 * ⚠️ IMPORTANTE: Stencils DEVEM permanecer em PNG (lossless)
 * JPEG corrompe imagens preto/branco com detalhes finos!
 * 
 * 🔧 LIMITE VERCEL: 4.5MB body máximo
 * Usamos 2MB para ter margem para headers e metadados
 */

/**
 * Comprime uma imagem base64 para um tamanho máximo
 * 
 * ⚠️ CORREÇÃO CRÍTICA: Usa PNG com redução de dimensões
 * Nunca converte para JPEG (causa corrupção de stencils!)
 * 
 * @param base64 - Imagem em base64 (data:image/...;base64,...)
 * @param maxSizeKB - Tamanho máximo em KB (padrão: 2000 = 2MB)
 * @param depth - Profundidade de recursão (interno, não usar)
 * @returns Promise<string> - Imagem comprimida em base64 (sempre PNG)
 */
export async function compressImage(
  base64: string,
  maxSizeKB: number = 2000,
  depth: number = 0
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

          console.log('[Compress] ✅ Compressão PNG concluída:', compressedSizeKB, 'KB (tentativa', depth + 1, ')');
          
          // Se ainda muito grande, tentar reduzir mais (recursivo com limite)
          const MAX_RECURSION = 5;
          if (compressedSizeKB > maxSizeKB && targetWidth > minDimension && targetHeight > minDimension && depth < MAX_RECURSION) {
            console.log('[Compress] Ainda grande, tentando reduzir mais... (tentativa', depth + 2, ')');
            // Chamar recursivamente com a imagem já reduzida
            compressImage(compressed, maxSizeKB, depth + 1).then(resolve).catch(reject);
          } else {
            if (compressedSizeKB > maxSizeKB) {
              console.warn('[Compress] ⚠️ Não foi possível reduzir abaixo de', maxSizeKB, 'KB. Tamanho final:', compressedSizeKB, 'KB');
            }
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

  // 🔧 Limite de 2MB para ter margem com o limite Vercel de 4.5MB
  // (precisa margem para headers, metadados e múltiplas imagens na request)
  if (sizeKB > 2000) {
    console.log('[Compress] Imagem muito grande (' + sizeKB + 'KB), comprimindo para < 2MB...');
    return await compressImage(base64, 2000);
  }

  return base64;
}
