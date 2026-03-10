import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('../../supabase', () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

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
  PLAN_LIMITS,
  getLimitMessage,
  type UsageLimits,
} from '../limits';

import type { PlanType } from '../types';

// ---------------------------------------------------------------------------
// Tests: PLAN_LIMITS structure (BYOK — all unlimited)
// ---------------------------------------------------------------------------

const ALL_PLANS: PlanType[] = ['free', 'ink', 'pro', 'studio'];
const ALL_LIMIT_KEYS: (keyof UsageLimits)[] = [
  'editorGenerations',
  'aiRequests',
  'toolsUsage',
];

describe('PLAN_LIMITS structure (BYOK model)', () => {
  it('should define limits for all plans', () => {
    for (const plan of ALL_PLANS) {
      expect(PLAN_LIMITS[plan]).toBeDefined();
    }
  });

  it('all plans should have all required keys', () => {
    for (const plan of ALL_PLANS) {
      for (const key of ALL_LIMIT_KEYS) {
        expect(PLAN_LIMITS[plan][key]).toBeDefined();
        expect(typeof PLAN_LIMITS[plan][key]).toBe('number');
      }
    }
  });

  it('all plans should be unlimited (-1) for all limit types', () => {
    for (const plan of ALL_PLANS) {
      expect(PLAN_LIMITS[plan].editorGenerations).toBe(-1);
      expect(PLAN_LIMITS[plan].aiRequests).toBe(-1);
      expect(PLAN_LIMITS[plan].toolsUsage).toBe(-1);
    }
  });

  it('all plans should be unlimited (-1) for individual tool limits', () => {
    for (const plan of ALL_PLANS) {
      expect(PLAN_LIMITS[plan].removeBackground).toBe(-1);
      expect(PLAN_LIMITS[plan].enhance4K).toBe(-1);
      expect(PLAN_LIMITS[plan].colorMatch).toBe(-1);
      expect(PLAN_LIMITS[plan].splitA4).toBe(-1);
    }
  });

  it('free plan should have same limits as paid plans (BYOK)', () => {
    expect(PLAN_LIMITS.free.editorGenerations).toBe(PLAN_LIMITS.pro.editorGenerations);
    expect(PLAN_LIMITS.free.aiRequests).toBe(PLAN_LIMITS.studio.aiRequests);
  });
});

// ---------------------------------------------------------------------------
// Tests: getLimitMessage
// ---------------------------------------------------------------------------

describe('getLimitMessage', () => {
  it('should return a generic access restriction message', () => {
    const msg = getLimitMessage('editor_generation', -1);
    expect(msg).toContain('acesso restrito');
  });

  it('should return same message regardless of parameters', () => {
    const msg1 = getLimitMessage('editor_generation', -1);
    const msg2 = getLimitMessage('tool_usage', -1, new Date());
    expect(msg1).toBe(msg2);
  });
});
