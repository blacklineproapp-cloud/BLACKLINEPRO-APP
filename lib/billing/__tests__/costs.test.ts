import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  calculateGeminiCost,
  calculateCostWithFallback,
  BRL_COST,
  USD_COST,
  CREDITS_COST,
  GEMINI_PRICING,
  type OperationType,
} from '../costs';

// ---------------------------------------------------------------------------
// All operation types that must exist
// ---------------------------------------------------------------------------

const ALL_OPERATIONS: OperationType[] = [
  'topographic',
  'lines',
  'anime',
  'ia_gen',
  'enhance',
  'color_match',
  'remove_bg',
  'split_a4',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Cost maps completeness', () => {
  it('BRL_COST should have entries for all operation types', () => {
    for (const op of ALL_OPERATIONS) {
      expect(BRL_COST[op]).toBeDefined();
      expect(typeof BRL_COST[op]).toBe('number');
      expect(BRL_COST[op]).toBeGreaterThan(0);
    }
  });

  it('USD_COST should have entries for all operation types', () => {
    for (const op of ALL_OPERATIONS) {
      expect(USD_COST[op]).toBeDefined();
      expect(typeof USD_COST[op]).toBe('number');
      expect(USD_COST[op]).toBeGreaterThan(0);
    }
  });

  it('CREDITS_COST should have entries for all operation types', () => {
    for (const op of ALL_OPERATIONS) {
      expect(CREDITS_COST[op]).toBeDefined();
      expect(CREDITS_COST[op]).toBe(1); // All ops cost 1 credit
    }
  });
});

describe('calculateGeminiCost', () => {
  it('should calculate cost from valid usageMetadata', () => {
    const cost = calculateGeminiCost({
      promptTokenCount: 1000,
      candidatesTokenCount: 500,
    });

    const expected =
      1000 * GEMINI_PRICING.INPUT_TOKEN + 500 * GEMINI_PRICING.OUTPUT_TOKEN;
    expect(cost).toBeCloseTo(expected, 10);
    expect(cost).toBeGreaterThan(0);
  });

  it('should return 0 when usageMetadata is undefined', () => {
    const cost = calculateGeminiCost(undefined);
    expect(cost).toBe(0);
  });

  it('should handle zero tokens gracefully', () => {
    const cost = calculateGeminiCost({
      promptTokenCount: 0,
      candidatesTokenCount: 0,
    });
    expect(cost).toBe(0);
  });

  it('should handle partial metadata (only promptTokenCount)', () => {
    const cost = calculateGeminiCost({
      promptTokenCount: 2000,
    });

    const expected = 2000 * GEMINI_PRICING.INPUT_TOKEN;
    expect(cost).toBeCloseTo(expected, 10);
  });

  it('should handle partial metadata (only candidatesTokenCount)', () => {
    const cost = calculateGeminiCost({
      candidatesTokenCount: 800,
    });

    const expected = 800 * GEMINI_PRICING.OUTPUT_TOKEN;
    expect(cost).toBeCloseTo(expected, 10);
  });
});

describe('calculateCostWithFallback', () => {
  it('should use real token cost when usageMetadata is provided', () => {
    const cost = calculateCostWithFallback('topographic', {
      promptTokenCount: 1000,
      candidatesTokenCount: 500,
    });

    const expected =
      1000 * GEMINI_PRICING.INPUT_TOKEN + 500 * GEMINI_PRICING.OUTPUT_TOKEN;
    expect(cost).toBeCloseTo(expected, 10);
  });

  it('should fallback to USD_COST estimate when no tokens provided', () => {
    const cost = calculateCostWithFallback('topographic', undefined);
    expect(cost).toBe(USD_COST.topographic);
  });

  it('should fallback when usageMetadata has zero tokens', () => {
    const cost = calculateCostWithFallback('enhance', {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
    });
    expect(cost).toBe(USD_COST.enhance);
  });

  it('should work for every operation type with fallback', () => {
    for (const op of ALL_OPERATIONS) {
      const cost = calculateCostWithFallback(op);
      expect(cost).toBe(USD_COST[op]);
    }
  });
});
