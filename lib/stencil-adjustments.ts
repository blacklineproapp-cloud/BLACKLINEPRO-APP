import { AdjustControls, STENCIL_PRESETS } from './stencil-types';

/**
 * Helper functions para aplicar ajustes em stencils
 * Centraliza lógica de comunicação com API
 */

/**
 * Aplica ajustes em uma imagem usando a API /adjust-stencil
 *
 * @param imageBase64 - Imagem em base64 (data:image/png;base64,...)
 * @param controls - Controles de ajuste
 * @returns Imagem ajustada em base64
 */
export async function applyAdjustments(
  imageBase64: string,
  controls: AdjustControls
): Promise<string> {
  // Validações de entrada
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('Imagem inválida ou não fornecida');
  }

  if (!imageBase64.startsWith('data:image/')) {
    throw new Error('Formato de imagem inválido (esperado base64)');
  }

  if (!controls || typeof controls !== 'object') {
    throw new Error('Controles inválidos');
  }

  try {
    console.log('[Adjustments] Enviando requisição:', {
      imageLength: imageBase64.length,
      controlsKeys: Object.keys(controls)
    });

    const response = await fetch('/api/adjust-stencil', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageBase64,
        controls
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Adjustments] Erro da API:', errorData);
      throw new Error(errorData.error || 'Erro ao aplicar ajustes');
    }

    const data = await response.json();
    console.log('[Adjustments] Sucesso, imagem ajustada recebida');
    return data.image;
  } catch (error: any) {
    console.error('[Adjustments] Erro ao aplicar ajustes:', error);
    throw new Error(error.message || 'Erro ao processar ajustes');
  }
}

/**
 * Aplica preset de ajustes em controles existentes
 *
 * @param currentControls - Controles atuais
 * @param presetKey - Chave do preset (delicate, bold, minimal, etc)
 * @returns Novos controles com preset aplicado (garante que todos os campos existem)
 */
export function applyPreset(
  currentControls: AdjustControls,
  presetKey: string
): AdjustControls {
  const preset = STENCIL_PRESETS[presetKey];

  if (!preset) {
    console.warn(`[Adjustments] Preset "${presetKey}" não encontrado`);
    return currentControls;
  }

  // IMPORTANTE: Sempre retornar objeto completo, não apenas os campos do preset
  const newControls = {
    ...currentControls,
    ...preset.controls
  };

  // Garantir que todos os campos obrigatórios existem
  return {
    brightness: newControls.brightness ?? 0,
    contrast: newControls.contrast ?? 0,
    threshold: newControls.threshold ?? 128,
    gamma: newControls.gamma ?? 1.0,
    rotation: newControls.rotation ?? 0,
    flipHorizontal: newControls.flipHorizontal ?? false,
    flipVertical: newControls.flipVertical ?? false,
    invert: newControls.invert ?? false,
    removeNoise: newControls.removeNoise ?? false,
    noiseReduction: newControls.noiseReduction ?? 1,
    sharpen: newControls.sharpen ?? false,
    sharpenAmount: newControls.sharpenAmount ?? 1
  };
}

/**
 * Verifica se controles estão nos valores padrão (sem ajustes)
 *
 * @param controls - Controles a verificar
 * @returns true se todos os valores estão no padrão
 */
export function isDefaultControls(controls: AdjustControls): boolean {
  return (
    controls.brightness === 0 &&
    controls.contrast === 0 &&
    controls.threshold === 128 &&
    controls.gamma === 1.0 &&
    controls.rotation === 0 &&
    !controls.flipHorizontal &&
    !controls.flipVertical &&
    !controls.invert &&
    !controls.removeNoise &&
    !controls.sharpen
  );
}

/**
 * Reseta controles para valores padrão
 *
 * @returns Controles nos valores padrão
 */
export function resetControls(): AdjustControls {
  return {
    brightness: 0,
    contrast: 0,
    threshold: 128,
    gamma: 1.0,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    invert: false,
    removeNoise: false,
    noiseReduction: 1,
    sharpen: false,
    sharpenAmount: 1
  };
}

/**
 * Valida se controles estão dentro dos limites aceitáveis
 *
 * @param controls - Controles a validar
 * @returns true se válidos, senão retorna mensagem de erro
 */
export function validateControls(
  controls: AdjustControls
): { valid: boolean; error?: string } {
  if (controls.brightness < -100 || controls.brightness > 100) {
    return { valid: false, error: 'Brilho deve estar entre -100 e +100' };
  }

  if (controls.contrast < -100 || controls.contrast > 100) {
    return { valid: false, error: 'Contraste deve estar entre -100 e +100' };
  }

  if (controls.threshold < 0 || controls.threshold > 255) {
    return { valid: false, error: 'Threshold deve estar entre 0 e 255' };
  }

  if (controls.gamma < 0.5 || controls.gamma > 2.0) {
    return { valid: false, error: 'Gamma deve estar entre 0.5 e 2.0' };
  }

  if (controls.rotation < -180 || controls.rotation > 180) {
    return { valid: false, error: 'Rotação deve estar entre -180° e +180°' };
  }

  if (controls.noiseReduction < 0 || controls.noiseReduction > 10) {
    return { valid: false, error: 'Redução de ruído deve estar entre 0 e 10' };
  }

  if (controls.sharpenAmount < 0 || controls.sharpenAmount > 10) {
    return { valid: false, error: 'Nitidez deve estar entre 0 e 10' };
  }

  return { valid: true };
}
