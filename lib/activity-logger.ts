/**
 * Sistema de Logging de Atividades de Usuários
 * Registra ações no banco para visualização no painel admin
 */

import { supabaseAdmin } from './supabase';
import { logger } from './logger';

// Tipos de atividade suportados
export type ActivityType =
  | 'generation'          // Geração de estêncil
  | 'download'            // Download de resultado
  | 'error'               // Erro genérico
  | 'payment'             // Ação relacionada a pagamento
  | 'login'               // Login do usuário
  | 'api_call'            // Chamada à API
  | 'webhook'             // Webhook recebido
  | 'admin_action';       // Ação de admin

interface LogActivityParams {
  userId: string;
  type: ActivityType;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  errorStack?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  durationMs?: number;
}

/**
 * Registra uma atividade do usuário
 */
export async function logUserActivity(params: LogActivityParams): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('log_user_activity', {
      p_user_id: params.userId,
      p_activity_type: params.type,
      p_details: params.details || {},
      p_success: params.success ?? true,
      p_error_message: params.errorMessage || null,
      p_error_stack: params.errorStack || null,
      p_ip_address: params.ipAddress || null,
      p_user_agent: params.userAgent || null,
      p_endpoint: params.endpoint || null,
      p_duration_ms: params.durationMs || null,
    });

    if (error) {
      logger.error('[Activity Logger] Erro ao registrar log', error);
      return null;
    }

    return data as string;
  } catch (err: unknown) {
    logger.error('[Activity Logger] Erro fatal', err);
    return null;
  }
}

/**
 * Registra uma geração na tabela generation_history
 */
export async function logGeneration(params: {
  userId: string;
  generationType: 'stencil' | 'tattoo_idea' | 'enhance' | 'remove_bg' | 'analyze_colors';
  style?: 'standard' | 'perfect_lines';
  promptDetails?: string;
  modelConfig?: Record<string, any>;
  inputImageUrl?: string;
  outputImageUrl?: string;
  status: 'processing' | 'completed' | 'failed';
  success: boolean;
  errorMessage?: string;
  processingTimeMs?: number;
  queueTimeMs?: number;
}): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('generation_history')
      .insert({
        user_id: params.userId,
        generation_type: params.generationType,
        style: params.style || null,
        prompt_details: params.promptDetails || null,
        model_config: params.modelConfig || null,
        input_image_url: params.inputImageUrl || null,
        output_image_url: params.outputImageUrl || null,
        status: params.status,
        success: params.success,
        error_message: params.errorMessage || null,
        processing_time_ms: params.processingTimeMs || null,
        queue_time_ms: params.queueTimeMs || null,
        completed_at: params.status === 'completed' || params.status === 'failed' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('[Activity Logger] Erro ao registrar geração', error);
      return null;
    }

    return data?.id || null;
  } catch (err: unknown) {
    logger.error('[Activity Logger] Erro fatal ao registrar geração', err);
    return null;
  }
}

/**
 * Atualiza o status de uma geração
 */
export async function updateGenerationStatus(params: {
  generationId: string;
  status: 'processing' | 'completed' | 'failed';
  success?: boolean;
  errorMessage?: string;
  outputImageUrl?: string;
  processingTimeMs?: number;
}): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('generation_history')
      .update({
        status: params.status,
        success: params.success,
        error_message: params.errorMessage || null,
        output_image_url: params.outputImageUrl || null,
        processing_time_ms: params.processingTimeMs || null,
        completed_at: params.status === 'completed' || params.status === 'failed' ? new Date().toISOString() : null,
      })
      .eq('id', params.generationId);

    if (error) {
      logger.error('[Activity Logger] Erro ao atualizar geração', error);
      return false;
    }

    return true;
  } catch (err: unknown) {
    logger.error('[Activity Logger] Erro fatal ao atualizar geração', err);
    return false;
  }
}

/**
 * Helper para extrair IP e User-Agent da request
 */
export function extractRequestMetadata(req: Request): { ipAddress?: string; userAgent?: string } {
  const headers = req.headers;

  // Tentar extrair IP (considerando proxies)
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    undefined;

  const userAgent = headers.get('user-agent') || undefined;

  return { ipAddress, userAgent };
}

/**
 * Wrapper para medir duração de uma função
 */
export async function withTiming<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now();
  const result = await fn();
  const durationMs = Date.now() - startTime;
  return { result, durationMs };
}
