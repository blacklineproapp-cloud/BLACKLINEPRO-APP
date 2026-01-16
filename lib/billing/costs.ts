/**
 * Operation Costs
 * Custos por operação para registro de uso
 *
 * ATUALIZADO: Janeiro 2026
 * - Centralizado de credits.ts (legado) para billing/costs.ts
 * - Usado apenas para registro de custo em BRL/USD no ai_usage
 */

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
