/**
 * StencilFlow API Client
 * Integração com Python API para processamento de stencils
 */

const API_URL = process.env.NEXT_PUBLIC_STENCIL_API_URL || 'http://localhost:8000';

export type PipelineType = 'simple' | 'advanced' | 'sketch' | 'lineart';

export interface ProcessParams {
  // Simple pipeline
  blur_size?: number;
  threshold_value?: number;
  use_otsu?: boolean;
  morph_kernel_size?: number;
  morph_iterations?: number;
  min_contour_area?: number;

  // Advanced pipeline
  denoise_strength?: number;
  clahe_clip?: number;
  canny_low?: number;
  canny_high?: number;

  // Sketch pipeline
  blur_sigma?: number;
  sketch_threshold?: number;

  // Line art pipeline
  bilateral_d?: number;
  bilateral_sigma?: number;
  adaptive_block_size?: number;
  adaptive_c?: number;
}

export interface ProcessResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  pipeline: string;
}

/**
 * Processar imagem usando API Python
 */
export async function processStencil(
  file: File,
  pipeline: PipelineType = 'advanced',
  params?: ProcessParams
): Promise<ProcessResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pipeline', pipeline);

  // Adicionar parâmetros opcionais
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_URL}/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.statusText} - ${errorText}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    width: parseInt(response.headers.get('X-Image-Width') || '0'),
    height: parseInt(response.headers.get('X-Image-Height') || '0'),
    pipeline: response.headers.get('X-Pipeline') || pipeline,
  };
}

/**
 * Processar múltiplas imagens em batch
 */
export async function processBatch(
  files: File[],
  pipeline: PipelineType = 'advanced'
): Promise<Array<{
  filename: string;
  data?: string;
  error?: string;
  success: boolean;
}>> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('pipeline', pipeline);

  const response = await fetch(`${API_URL}/batch`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Batch API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

/**
 * Verificar saúde da API
 */
export async function checkHealth(): Promise<{
  status: string;
  opencv_version: string;
  numpy_version: string;
}> {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error('API health check failed');
  }

  return await response.json();
}

/**
 * Verificar se API está online
 */
export async function isApiOnline(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}
