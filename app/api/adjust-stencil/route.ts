import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { AdjustControls } from '@/lib/stencil-types';
import { validateImage, createValidationErrorResponse } from '@/lib/image-validation';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api-middleware';

/**
 * API Route: Ajustar Stencil com Sharp.js (SIMPLIFICADO E OTIMIZADO)
 *
 * Ordem de Processamento (cada ajuste independente):
 * FASE 1: Pré-processamento → FASE 2: Ajustes Tonais → FASE 3: Corte → FASE 4: Transformações
 */

export const POST = withAuth(async (req, { userId, user }) => {
  // Parse JSON
  const body = await req.json();
  const image = body?.image;
  const controls: AdjustControls = body?.controls;

  if (!image) {
    return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
  }

  if (!controls) {
    return NextResponse.json({ error: 'Controles não fornecidos' }, { status: 400 });
  }

  // 🚀 CORREÇÃO #1: Validar imagem ANTES de criar buffer (previne OOM)
  const validation = await validateImage(image);
  if (!validation.valid) {
    logger.warn('[Adjust] Validação falhou', { error: validation.error });
    return NextResponse.json(
      createValidationErrorResponse(validation),
      { status: 413 }
    );
  }

  // Converter base64 para Buffer (agora seguro)
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  logger.info('[Adjust] Processando imagem', validation.metadata);

  // =========================================================================
  // PROCESSAR AJUSTES (ORDEM CORRETA E INDEPENDENTE)
  // =========================================================================

  let processed = sharp(imageBuffer);

  // Extrair valores com defaults seguros e validação de tipos
  const brightness = typeof controls.brightness === 'number' ? controls.brightness : 0;
  const contrast = typeof controls.contrast === 'number' ? controls.contrast : 0;
  const threshold = typeof controls.threshold === 'number' ? controls.threshold : 128;
  const gamma = typeof controls.gamma === 'number' ? controls.gamma : 1.0;
  const rotation = typeof controls.rotation === 'number' ? controls.rotation : 0;
  const flipHorizontal = controls.flipHorizontal === true;
  const flipVertical = controls.flipVertical === true;
  const invert = controls.invert === true;
  const sharpen = controls.sharpen === true;
  const sharpenAmount = typeof controls.sharpenAmount === 'number' ? controls.sharpenAmount : 1.0;
  const removeNoise = controls.removeNoise === true;
  const noiseReduction = typeof controls.noiseReduction === 'number' ? controls.noiseReduction : 1.0;

  // =========================================================================
  // FASE 1: PRÉ-PROCESSAMENTO (opcional - melhora qualidade)
  // =========================================================================

  // 1.1 Remover Ruído (blur suave)
  if (removeNoise && noiseReduction > 0) {
    const sigma = Math.max(0.5, Math.min(2.0, noiseReduction));
    processed = processed.blur(sigma);
    logger.debug('[Adjust] Noise reduction aplicado', { sigma });
  }

  // 1.2 Sharpen (nitidez)
  if (sharpen && sharpenAmount > 0) {
    const sigma = Math.max(0.5, Math.min(3.0, sharpenAmount));
    processed = processed.sharpen({ sigma });
    logger.debug('[Adjust] Sharpen aplicado', { sigma });
  }

  // =========================================================================
  // FASE 2: AJUSTES TONAIS (core - aplicados separadamente)
  // =========================================================================

  // 2.1 Brightness (brilho)
  if (brightness !== 0) {
    const safeBrightness = Math.max(-100, Math.min(100, brightness));
    const brightnessFactor = 1 + (safeBrightness / 100);
    processed = processed.modulate({ brightness: brightnessFactor });
    logger.debug('[Adjust] Brightness aplicado', { safeBrightness, brightnessFactor });
  }

  // 2.2 Contrast (contraste)
  if (contrast !== 0) {
    const safeContrast = Math.max(-100, Math.min(100, contrast));
    const contrastFactor = 1 + (safeContrast / 100);
    const offset = -(128 * contrastFactor) + 128;
    processed = processed.linear(contrastFactor, offset);
    logger.debug('[Adjust] Contrast aplicado', { safeContrast, contrastFactor });
  }

  // 2.3 Gamma (meios-tons) - APENAS UMA VEZ
  if (gamma !== 1.0) {
    const safeGamma = Math.max(0.5, Math.min(2.5, gamma));
    processed = processed.gamma(safeGamma);
    logger.debug('[Adjust] Gamma aplicado', { safeGamma });
  }

  // =========================================================================
  // FASE 3: CORTE (threshold - preto/branco)
  // =========================================================================

  if (threshold !== 128) {
    const safeThreshold = Math.max(0, Math.min(255, threshold));
    processed = processed.greyscale();
    processed = processed.threshold(safeThreshold);
    logger.debug('[Adjust] Threshold aplicado', { safeThreshold });
  }

  // =========================================================================
  // FASE 4: TRANSFORMAÇÕES GEOMÉTRICAS (sempre por último)
  // =========================================================================

  // 4.1 Inverter cores
  if (invert) {
    processed = processed.negate();
    logger.debug('[Adjust] Invert aplicado');
  }

  // 4.2 Rotação
  if (rotation !== 0) {
    const safeRotation = Math.max(-180, Math.min(180, rotation));
    processed = processed.rotate(safeRotation, {
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    });
    logger.debug('[Adjust] Rotation aplicado', { safeRotation });
  }

  // 4.3 Flip Horizontal
  if (flipHorizontal) {
    processed = processed.flop();
    logger.debug('[Adjust] Flip horizontal aplicado');
  }

  // 4.4 Flip Vertical
  if (flipVertical) {
    processed = processed.flip();
    logger.debug('[Adjust] Flip vertical aplicado');
  }

  // =========================================================================
  // GERAR IMAGEM FINAL (PNG com qualidade máxima)
  // =========================================================================

  const result = await processed
    .png({
      quality: 100,
      compressionLevel: 6,
      palette: false
    })
    .toBuffer();

  const base64Result = `data:image/png;base64,${result.toString('base64')}`;

  logger.info('[Adjust] Processamento concluído', {
    tamanhoOriginal: Math.round(imageBuffer.length / 1024) + 'KB',
    tamanhoFinal: Math.round(result.length / 1024) + 'KB'
  });

  return NextResponse.json({
    success: true,
    image: base64Result,
    metadata: {
      size: result.length,
      adjustments: controls
    }
  });
});

// Configuração de timeout e body size
export const maxDuration = 60;
export const runtime = 'nodejs';
