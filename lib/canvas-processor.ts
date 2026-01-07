/**
 * CanvasProcessor: Motor de processamento de imagem de alta performance no cliente.
 * 
 * Permite aplicar filtros complexos (Threshold, Gamma, Brightness, Contrast) 
 * instantaneamente usando o navegador do usuário, eliminando o lag de rede.
 */

export interface ProcessOptions {
  threshold?: number;   // 0-255
  gamma?: number;       // 0.5-3.0
  brightness?: number;  // -100 a +100
  contrast?: number;    // -100 a +100
  invert?: boolean;
}

/**
 * Aplica ajustes de imagem usando Canvas API
 * @param sourceBase64 Imagem base64 original
 * @param options Opções de processamento
 * @returns Base64 da imagem processada
 */
export async function processImageOnClient(
  sourceBase64: string,
  options: ProcessOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto do Canvas'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Pré-calcular fatores
        const brightnessFactor = (options.brightness || 0) * 2.55;
        const contrastFactor = options.contrast !== undefined 
          ? (259 * (options.contrast + 255)) / (255 * (259 - options.contrast)) 
          : 1;
        const gammaValue = options.gamma || 1.0;
        const thresholdValue = options.threshold !== undefined ? options.threshold : 128;
        const doInvert = options.invert || false;

        // Loop de processamento de pixels (Otimizado)
        for (let i = 0; i < data.length; i += 4) {
          // 1. Converter para escala de cinza (Luminância)
          let r = data[i];
          let g = data[i+1];
          let b = data[i+2];
          
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // 2. Brightness
          if (options.brightness !== 0) {
            gray += brightnessFactor;
          }

          // 3. Contrast
          if (options.contrast !== 0) {
            gray = contrastFactor * (gray - 128) + 128;
          }

          // 4. Gamma Correction
          if (gammaValue !== 1.0) {
            gray = 255 * Math.pow(gray / 255, 1 / gammaValue);
          }

          // 5. Threshold (Binário)
          // ✨ CORREÇÃO: Só aplicar threshold se o usuário mudar o valor padrão (128)
          // Se estiver em 128, preservamos os tons de cinza originais da IA
          if (options.threshold !== undefined && options.threshold !== 128) {
            gray = gray >= thresholdValue ? 255 : 0;
          }

          // 6. Invert
          if (doInvert) {
            gray = 255 - gray;
          }

          // Aplicar resultado
          data[i] = data[i+1] = data[i+2] = Math.max(0, Math.min(255, gray));
          // data[i+3] (alpha) permanece o mesmo
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Falha ao carregar imagem para o Canvas'));
    img.src = sourceBase64;
  });
}
