/**
 * Operation Costs
 * Custos por operação para registro de uso
 *
 * ATUALIZADO: Janeiro 2026
 * - Centralizado de credits.ts (legado) para billing/costs.ts
 * - Usado apenas para registro de custo em BRL/USD no ai_usage
 */

import { logger } from '../logger';

// Tipos de operação suportados
export type OperationType =
  | 'topographic'
  | 'lines'
  | 'anime'
  | 'ia_gen'
  | 'enhance'
  | 'color_match'
  | 'remove_bg'
  | 'split_a4';

// Custo em créditos por operação (SIMPLIFICADO - tudo 1 crédito)
export const CREDITS_COST: Record<OperationType, number> = {
  topographic: 1,
  lines: 1,
  anime: 1, // Anime/Ilustração/Maori/Tribal
  ia_gen: 1,
  enhance: 1,
  color_match: 1,
  remove_bg: 1,
  split_a4: 1,
};

// Custo real em USD (Gemini 2.5 Flash Image - Janeiro 2026)
// Fonte: https://ai.google.dev/gemini-api/docs/pricing
export const USD_COST: Record<OperationType, number> = {
  topographic: 0.039, // Gemini 2.5 Flash Image
  lines: 0.039, // Gemini 2.5 Flash Image
  anime: 0.039, // Gemini 2.5 Flash Image (Anime/Ilustração)
  ia_gen: 0.039, // Gemini 2.5 Flash Image
  enhance: 0.039, // Gemini 2.5 Flash Image (4K upscale)
  color_match: 0.02, // Apenas análise de texto (input)
  remove_bg: 0.02, // Background removal
  split_a4: 0.01, // Tiled printing processing
};

// Custo em BRL (dólar a R$ 5,00)
export const BRL_COST: Record<OperationType, number> = {
  topographic: 0.195,
  lines: 0.195,
  anime: 0.195, // Anime/Ilustração/Maori/Tribal
  ia_gen: 0.195,
  enhance: 0.195,
  color_match: 0.1,
  remove_bg: 0.1,
  split_a4: 0.05,
};

// ============================================================================
// CÁLCULO DE CUSTO REAL (GEMINI API)
// ============================================================================

/**
 * Preços reais do Gemini 2.5 Flash (Janeiro 2026)
 * Fonte: https://ai.google.dev/gemini-api/docs/pricing
 */
export const GEMINI_PRICING = {
  INPUT_TOKEN: 0.00001875,   // $0.00001875 por token de input
  OUTPUT_TOKEN: 0.000075,    // $0.000075 por token de output
};

/**
 * Calcula custo real baseado em tokens usados pela API Gemini
 * 
 * @param usageMetadata - Metadata retornado pela API Gemini
 * @returns Custo real em USD
 */
export function calculateGeminiCost(usageMetadata?: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}): number {
  if (!usageMetadata) {
    logger.warn('[Cost] usageMetadata não fornecido, retornando 0');
    return 0;
  }

  const inputTokens = usageMetadata.promptTokenCount || 0;
  const outputTokens = usageMetadata.candidatesTokenCount || 0;
  
  const inputCost = inputTokens * GEMINI_PRICING.INPUT_TOKEN;
  const outputCost = outputTokens * GEMINI_PRICING.OUTPUT_TOKEN;
  
  const totalCost = inputCost + outputCost;
  
  logger.debug('[Cost] Token usage calculated', { inputTokens, outputTokens, totalCostUSD: totalCost.toFixed(6) });
  
  return totalCost;
}

/**
 * Calcula custo com fallback para estimativa hardcoded
 * Útil quando usageMetadata não está disponível
 */
export function calculateCostWithFallback(
  operationType: OperationType,
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
): number {
  if (usageMetadata && (usageMetadata.promptTokenCount || usageMetadata.candidatesTokenCount)) {
    const realCost = calculateGeminiCost(usageMetadata);
    const estimatedCost = USD_COST[operationType];
    
    logger.debug('[Cost] Cost comparison', { estimatedCost, realCost: realCost.toFixed(6) });
    
    return realCost;
  }
  
  // Fallback para estimativa hardcoded
  logger.warn('[Cost] usageMetadata indisponível, usando estimativa', { operationType, estimatedCost: USD_COST[operationType] });
  return USD_COST[operationType];
}

