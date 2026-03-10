import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Create chainable sharp mock — defined inside the factory to avoid hoisting issues
const sharpInstance = {
  greyscale: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  resize: vi.fn().mockReturnThis(),
  metadata: vi.fn(),
  toBuffer: vi.fn(),
};

vi.mock('sharp', () => {
  const fn = vi.fn(() => sharpInstance);
  return { default: fn };
});

// Re-import to get the mocked version for assertions
const { default: sharpFn } = await import('sharp') as any;

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

import { enforceMonochrome, ensureDimensionsMatch } from '../image-preprocessing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a tiny 1x1 PNG-like base64 string for testing */
const FAKE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk';
const FAKE_DATA_URI = `data:image/png;base64,${FAKE_BASE64}`;
const OUTPUT_BUFFER = Buffer.from('output-png-bytes');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('enforceMonochrome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharpInstance.toBuffer.mockResolvedValue(OUTPUT_BUFFER);
  });

  it('should strip data URI prefix and call sharp with raw buffer', async () => {
    await enforceMonochrome(FAKE_DATA_URI);

    // sharp should receive a Buffer (the decoded base64, without the prefix)
    expect(sharpFn).toHaveBeenCalledTimes(1);
    const arg = sharpFn.mock.calls[0][0];
    expect(Buffer.isBuffer(arg)).toBe(true);
  });

  it('should call greyscale() to produce grayscale output', async () => {
    await enforceMonochrome(FAKE_DATA_URI);

    expect(sharpInstance.greyscale).toHaveBeenCalledTimes(1);
  });

  it('should output a PNG data URI', async () => {
    const result = await enforceMonochrome(FAKE_DATA_URI);

    expect(result.startsWith('data:image/png;base64,')).toBe(true);
    expect(sharpInstance.png).toHaveBeenCalledWith({ compressionLevel: 6 });
  });

  it('should handle input without data URI prefix', async () => {
    await enforceMonochrome(FAKE_BASE64);

    // Should still work — the regex replace is a no-op on raw base64
    expect(sharpFn).toHaveBeenCalledTimes(1);
    expect(sharpInstance.greyscale).toHaveBeenCalledTimes(1);
  });
});

describe('ensureDimensionsMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharpInstance.toBuffer.mockResolvedValue(OUTPUT_BUFFER);
  });

  it('should return original image when dimensions already match', async () => {
    sharpInstance.metadata.mockResolvedValue({ width: 800, height: 600 });

    const result = await ensureDimensionsMatch(FAKE_DATA_URI, 800, 600);

    // Should return the original string untouched
    expect(result).toBe(FAKE_DATA_URI);
    // resize should NOT be called
    expect(sharpInstance.resize).not.toHaveBeenCalled();
  });

  it('should resize when dimensions do not match', async () => {
    sharpInstance.metadata.mockResolvedValue({ width: 1024, height: 768 });

    const result = await ensureDimensionsMatch(FAKE_DATA_URI, 800, 600);

    expect(sharpInstance.resize).toHaveBeenCalledWith(800, 600, {
      fit: 'fill',
      kernel: 'lanczos3',
    });
    expect(result.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('should resize when only width differs', async () => {
    sharpInstance.metadata.mockResolvedValue({ width: 900, height: 600 });

    await ensureDimensionsMatch(FAKE_DATA_URI, 800, 600);

    expect(sharpInstance.resize).toHaveBeenCalledWith(800, 600, expect.any(Object));
  });

  it('should resize when only height differs', async () => {
    sharpInstance.metadata.mockResolvedValue({ width: 800, height: 700 });

    await ensureDimensionsMatch(FAKE_DATA_URI, 800, 600);

    expect(sharpInstance.resize).toHaveBeenCalledWith(800, 600, expect.any(Object));
  });

  it('should use lanczos3 kernel for best quality', async () => {
    sharpInstance.metadata.mockResolvedValue({ width: 500, height: 500 });

    await ensureDimensionsMatch(FAKE_DATA_URI, 800, 600);

    expect(sharpInstance.resize).toHaveBeenCalledWith(
      800,
      600,
      expect.objectContaining({ kernel: 'lanczos3' })
    );
  });
});
