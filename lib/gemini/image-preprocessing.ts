import sharp from 'sharp';
import { logger } from '../logger';

/**
 * Pre-processes the image to force the model to generate lines, not copy the photo
 *
 * For dark/low-quality images:
 * 1. Detects if it's dark (low pixel average)
 * 2. Applies gamma correction to brighten
 * 3. Increases contrast aggressively
 * 4. Applies strong sharpening to enhance edges
 *
 * This "forces" Gemini to see clear edges it can convert to contours
 */
export async function prepareImageForStencil(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');

  // Get image statistics to detect if it's dark
  const stats = await sharp(buffer).stats();
  const avgBrightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;

  logger.debug('[Gemini] Brilho médio da imagem', { avgBrightness: avgBrightness.toFixed(1) });

  let processed = sharp(buffer);

  // If the image is dark (average < 100), apply aggressive gamma correction
  if (avgBrightness < 100) {
    logger.info('[Gemini] Imagem escura detectada, aplicando correção gamma');
    processed = processed.gamma(2.2); // Gamma > 1 brightens the image
  }

  // If the image is very dark (average < 60), brighten even more
  if (avgBrightness < 60) {
    logger.info('[Gemini] Imagem muito escura, aplicando brilho adicional');
    processed = processed.modulate({ brightness: 1.5 }); // +50% brightness
  }

  // Apply processing to enhance edges (on all images)
  const finalBuffer = await processed
    .normalize()                                    // Stretch histogram (maximum contrast)
    .sharpen({ sigma: 2.0, m1: 1.5, m2: 0.7 })     // Aggressive sharpening for edges
    .jpeg({ quality: 90 })
    .toBuffer();

  return finalBuffer.toString('base64');
}

/**
 * Removes any color from the image (converts to pure greyscale)
 * Does NOT apply threshold - preserves grey tones that represent
 * line density and hatching in the stencil
 */
export async function enforceMonochrome(base64DataUri: string): Promise<string> {
  const cleanBase64 = base64DataUri.replace(/^data:image\/[a-z]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  const monoBuffer = await sharp(buffer)
    .greyscale()                    // Remove all color information (no threshold!)
    .png({ compressionLevel: 6 })  // Clean PNG output
    .toBuffer();

  return `data:image/png;base64,${monoBuffer.toString('base64')}`;
}

/**
 * Ensures the output image dimensions match exactly the input dimensions
 * If dimensions don't match, resizes the output to match the input
 */
export async function ensureDimensionsMatch(
  outputImage: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const cleanBase64 = outputImage.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  const metadata = await sharp(buffer).metadata();

  // Check if dimensions are already correct
  if (metadata.width === targetWidth && metadata.height === targetHeight) {
    logger.debug('[Gemini] Output dimensions match', { targetWidth, targetHeight });
    return outputImage;
  }

  // Dimensions don't match - resize
  logger.warn('[Gemini] Dimension mismatch, resizing', {
    actual: `${metadata.width}x${metadata.height}`,
    expected: `${targetWidth}x${targetHeight}`,
  });

  const resized = await sharp(buffer)
    .resize(targetWidth, targetHeight, {
      fit: 'fill',        // Force exact dimensions (may distort if aspect ratio differs)
      kernel: 'lanczos3'  // Best quality for lineart
    })
    .png({ compressionLevel: 6 })
    .toBuffer();

  logger.info('[Gemini] Resized to target dimensions', { targetWidth, targetHeight });
  return `data:image/png;base64,${resized.toString('base64')}`;
}
