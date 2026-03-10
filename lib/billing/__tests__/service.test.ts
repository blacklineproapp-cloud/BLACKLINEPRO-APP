import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module under test is imported
// ---------------------------------------------------------------------------

vi.mock('../../auth', () => ({
  isAdmin: vi.fn(),
}));

vi.mock('../limits', () => ({
  recordUsage: vi.fn(),
}));

vi.mock('../costs', () => ({
  BRL_COST: {
    topographic: 0.195,
    lines: 0.195,
    anime: 0.195,
    ia_gen: 0.195,
    enhance: 0.195,
    color_match: 0.1,
    remove_bg: 0.1,
    split_a4: 0.05,
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

import { checkToolAccess, checkPaidAccess } from '../service';
import { isAdmin } from '../../auth';
import { recordUsage } from '../limits';

const mockedIsAdmin = vi.mocked(isAdmin);
const mockedRecordUsage = vi.mocked(recordUsage);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePaidUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-db-id',
    is_paid: true,
    subscription_status: 'active',
    tools_unlocked: true,
    ...overrides,
  };
}

function makeFreeUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-db-id',
    is_paid: false,
    subscription_status: 'none',
    tools_unlocked: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: checkToolAccess (BYOK — feature gating only, no limits)
// ---------------------------------------------------------------------------

describe('checkToolAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRecordUsage.mockResolvedValue(undefined);
  });

  // Admin bypass
  it('should allow admin regardless of plan', async () => {
    mockedIsAdmin.mockResolvedValue(true);

    const result = await checkToolAccess({
      userId: 'clerk-admin',
      user: makeFreeUser(),
      toolName: 'remove_bg',
      trialDeniedMessage: 'Blocked',
    });

    expect(result.denied).toBe(false);
    expect(result.isAdmin).toBe(true);
  });

  it('admin recordUsage should work with extra metadata', async () => {
    mockedIsAdmin.mockResolvedValue(true);

    const result = await checkToolAccess({
      userId: 'clerk-admin',
      user: makeFreeUser(),
      toolName: 'remove_bg',
      trialDeniedMessage: 'Blocked',
    });

    await result.recordUsage({ extra: 'data' });
    expect(mockedRecordUsage).toHaveBeenCalledTimes(1);
    expect(mockedRecordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-db-id',
        type: 'tool_usage',
        operationType: 'remove_bg',
        metadata: expect.objectContaining({ is_admin: true, extra: 'data' }),
      })
    );
  });

  // Paid user — feature access granted (BYOK, no limits)
  it('should allow paid user with tools_unlocked', async () => {
    mockedIsAdmin.mockResolvedValue(false);

    const result = await checkToolAccess({
      userId: 'clerk-user',
      user: makePaidUser(),
      toolName: 'enhance',
      trialDeniedMessage: 'Blocked',
    });

    expect(result.denied).toBe(false);
    expect(result.isAdmin).toBe(false);
  });

  // Free user — no access to premium tools (403)
  it('should deny free user access to premium tools', async () => {
    mockedIsAdmin.mockResolvedValue(false);

    const result = await checkToolAccess({
      userId: 'clerk-free',
      user: makeFreeUser(),
      toolName: 'remove_bg',
      trialDeniedMessage: 'Remoção de Fundo é exclusiva para assinantes.',
    });

    expect(result.denied).toBe(true);
    expect(result.response).toBeDefined();

    const json = await result.response!.json();
    expect(result.response!.status).toBe(403);
    expect(json.error).toBe('Acesso Restrito');
    expect(json.message).toBe('Remoção de Fundo é exclusiva para assinantes.');
    expect(json.requiresSubscription).toBe(true);
  });

  // Paid user without tools_unlocked — denied
  it('should deny paid user without tools_unlocked', async () => {
    mockedIsAdmin.mockResolvedValue(false);

    const result = await checkToolAccess({
      userId: 'clerk-user',
      user: makePaidUser({ tools_unlocked: false }),
      toolName: 'color_match',
      trialDeniedMessage: 'Harmonização de Cores é exclusiva para assinantes.',
    });

    expect(result.denied).toBe(true);
  });

  // recordUsage callable after access check
  it('recordUsage should be callable after successful access', async () => {
    mockedIsAdmin.mockResolvedValue(false);

    const result = await checkToolAccess({
      userId: 'clerk-user',
      user: makePaidUser(),
      toolName: 'color_match',
      trialDeniedMessage: 'Blocked',
    });

    expect(result.denied).toBe(false);
    await result.recordUsage();
    expect(mockedRecordUsage).toHaveBeenCalledTimes(1);
    expect(mockedRecordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-db-id',
        type: 'tool_usage',
        operationType: 'color_match',
        cost: 0.1,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// checkPaidAccess
// ---------------------------------------------------------------------------

describe('checkPaidAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRecordUsage.mockResolvedValue(undefined);
  });

  it('should allow admin', async () => {
    mockedIsAdmin.mockResolvedValue(true);

    const result = await checkPaidAccess({
      userId: 'clerk-admin',
      user: makeFreeUser(),
      featureName: 'generate-idea',
      deniedMessage: 'Denied',
    });

    expect(result.denied).toBe(false);
    expect(result.isAdmin).toBe(true);
  });

  it('should allow paid user with active subscription', async () => {
    mockedIsAdmin.mockResolvedValue(false);

    const result = await checkPaidAccess({
      userId: 'clerk-user',
      user: makePaidUser(),
      featureName: 'generate-idea',
      deniedMessage: 'Denied',
    });

    expect(result.denied).toBe(false);
    expect(result.isAdmin).toBe(false);
  });

  it('should deny free user with 403', async () => {
    mockedIsAdmin.mockResolvedValue(false);

    const result = await checkPaidAccess({
      userId: 'clerk-free',
      user: makeFreeUser(),
      featureName: 'generate-idea',
      deniedMessage: 'Precisa de assinatura.',
    });

    expect(result.denied).toBe(true);
    const json = await result.response!.json();
    expect(result.response!.status).toBe(403);
    expect(json.message).toBe('Precisa de assinatura.');
    expect(json.subscriptionType).toBe('subscription');
  });
});
