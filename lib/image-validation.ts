/**
 * Helper de Validação de Imagens
 *
 * Centraliza validações críticas para prevenir OOM e erros em produção
 * Usado em TODAS as rotas de processamento de imagem
 */

import sharp from 'sharp';
import { logger } from './logger';

// ============================================
// CONSTANTES
// ============================================

export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_IMAGE_DIMENSIONS = 8000; // 8000x8000px
export const ALLOWED_FORMATS = ['jpeg', 'jpg', 'png', 'webp'];

// ============================================
// TIPOS
// ============================================

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

// ============================================
// VALIDAÇÕES
// ============================================

/**
 * Valida tamanho do base64 ANTES de converter para buffer
 * Previne OOM ao criar Buffer.from() com imagens gigantes
 */
export function validateBase64Size(base64String: string): ImageValidationResult {
  try {
    // Remover prefixo data:image/...;base64, se existir
    const base64Data = base64String.includes(',')
      ? base64String.split(',')[1]
      : base64String;

    // Calcular tamanho real em bytes
    // Base64 aumenta tamanho em ~33%, então (length * 3) / 4 = tamanho original
    const sizeInBytes = (base64Data.length * 3) / 4;

    if (sizeInBytes > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (sizeInBytes / 1024 / 1024).toFixed(1);
      const maxMB = (MAX_IMAGE_SIZE_BYTES / 1024 / 1024).toFixed(0);

      logger.warn('[Image Validation] Imagem muito grande', {
        size: sizeMB + 'MB',
        max: maxMB + 'MB',
      });

      return {
        valid: false,
        error: `Imagem muito grande (${sizeMB}MB). Tamanho máximo: ${maxMB}MB`,
      };
    }

    return { valid: true };
  } catch (error: any) {
    logger.error('[Image Validation] Erro ao validar base64', error);
    return {
      valid: false,
      error: 'Formato de imagem inválido',
    };
  }
}

/**
 * Valida formato, dimensões e metadata da imagem
 * IMPORTANTE: Executar APÓS validateBase64Size para evitar criar buffer grande
 */
export async function validateImageMetadata(
  buffer: Buffer
): Promise<ImageValidationResult> {
  try {
    const metadata = await sharp(buffer).metadata();

    // Validar formato
    const format = metadata.format?.toLowerCase();
    if (!format || !ALLOWED_FORMATS.includes(format)) {
      logger.warn('[Image Validation] Formato não suportado', { format });
      return {
        valid: false,
        error: `Formato não suportado: ${format}. Use: ${ALLOWED_FORMATS.join(', ')}`,
      };
    }

    // Validar dimensões
    const { width = 0, height = 0 } = metadata;
    if (width > MAX_IMAGE_DIMENSIONS || height > MAX_IMAGE_DIMENSIONS) {
      logger.warn('[Image Validation] Dimensões muito grandes', {
        width,
        height,
        max: MAX_IMAGE_DIMENSIONS,
      });

      return {
        valid: false,
        error: `Imagem muito grande (${width}x${height}px). Máximo: ${MAX_IMAGE_DIMENSIONS}x${MAX_IMAGE_DIMENSIONS}px`,
      };
    }

    // Validar que tem dimensões válidas
    if (width === 0 || height === 0) {
      logger.warn('[Image Validation] Imagem sem dimensões', metadata);
      return {
        valid: false,
        error: 'Imagem corrompida ou inválida',
      };
    }

    return {
      valid: true,
      metadata: {
        width,
        height,
        format,
        size: buffer.length,
      },
    };
  } catch (error: any) {
    logger.error('[Image Validation] Erro ao ler metadata', error);

    // Erros específicos do Sharp
    if (error.message?.includes('Input buffer')) {
      return {
        valid: false,
        error: 'Formato de imagem não suportado ou arquivo corrompido',
      };
    }

    if (error.message?.includes('JPEG')) {
      return {
        valid: false,
        error: 'Arquivo JPEG corrompido',
      };
    }

    return {
      valid: false,
      error: 'Não foi possível processar a imagem',
    };
  }
}

/**
 * Validação completa: base64 + metadata
 * USO: Champar ANTES de qualquer processamento
 */
export async function validateImage(base64String: string): Promise<ImageValidationResult> {
  // 1. Validar tamanho base64 (rápido, evita criar buffer grande)
  const sizeCheck = validateBase64Size(base64String);
  if (!sizeCheck.valid) {
    return sizeCheck;
  }

  // 2. Criar buffer (agora seguro)
  try {
    const base64Data = base64String.includes(',')
      ? base64String.split(',')[1]
      : base64String;

    const buffer = Buffer.from(base64Data, 'base64');

    // 3. Validar metadata (formato, dimensões, etc)
    return await validateImageMetadata(buffer);
  } catch (error: any) {
    logger.error('[Image Validation] Erro ao criar buffer', error);
    return {
      valid: false,
      error: 'Base64 inválido ou corrompido',
    };
  }
}

/**
 * Validar buffer diretamente (quando já temos buffer em vez de base64)
 */
export async function validateImageBuffer(buffer: Buffer): Promise<ImageValidationResult> {
  // 1. Verificar tamanho
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    const maxMB = (MAX_IMAGE_SIZE_BYTES / 1024 / 1024).toFixed(0);

    return {
      valid: false,
      error: `Imagem muito grande (${sizeMB}MB). Máximo: ${maxMB}MB`,
    };
  }

  // 2. Validar metadata
  return await validateImageMetadata(buffer);
}

/**
 * Helper para validação em rotas
 * Retorna NextResponse com erro se inválido
 */
export function createValidationErrorResponse(
  validation: ImageValidationResult,
  statusCode: number = 400
) {
  return {
    error: validation.error || 'Imagem inválida',
    details: {
      maxSize: `${(MAX_IMAGE_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB`,
      maxDimensions: `${MAX_IMAGE_DIMENSIONS}x${MAX_IMAGE_DIMENSIONS}px`,
      allowedFormats: ALLOWED_FORMATS,
    },
  };
}
