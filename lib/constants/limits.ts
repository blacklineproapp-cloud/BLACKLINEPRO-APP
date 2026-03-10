/**
 * Centralized limits & thresholds
 */

// ============================================================================
// RATE LIMITS
// ============================================================================

export const RATE_LIMITS = {
  /** BYOK generation per IP: 100/hour */
  BYOK_IP: { max: 100, window: 3_600 },
  /** Stencil generation per user: 10/minute */
  STENCIL_GEN: { max: 10, window: 60 },
  /** Checkout per user: 5/hour */
  CHECKOUT: { max: 5, window: 3_600 },
  /** BYOK validation per IP: 10/hour */
  BYOK_VALIDATE: { max: 10, window: 3_600 },
  /** Admin panel: 100/minute */
  ADMIN: { max: 100, window: 60 },
  /** Default API: 60/minute */
  DEFAULT: { max: 60, window: 60 },
} as const;

// ============================================================================
// IMAGE LIMITS
// ============================================================================

export const IMAGE_LIMITS = {
  /** Max image file size: 50MB */
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  /** Max image dimensions (px) */
  MAX_DIMENSIONS: 8_000,
  /** Generator upload limit: 20MB */
  GENERATOR_MAX_SIZE: 20 * 1024 * 1024,
  /** Support ticket attachment: 5MB */
  SUPPORT_MAX_SIZE: 5 * 1024 * 1024,
  /** Proxy image limit: 10MB */
  PROXY_MAX_SIZE: 10 * 1024 * 1024,
  /** Minimum valid file size (bytes) */
  MIN_CONTENT_SIZE: 1_000,
} as const;

// ============================================================================
// IMAGE QUALITY THRESHOLDS
// ============================================================================

export const IMAGE_QUALITY = {
  /** Minimum DPI for print quality */
  MIN_DPI: 150,
  /** Minimum contrast level (0-100) */
  MIN_CONTRAST: 30,
  /** Minimum content percentage */
  MIN_CONTENT_PERCENT: 1,
  /** Max compression iterations */
  MAX_COMPRESSION_ITERATIONS: 5,
} as const;

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGINATION = {
  /** Clerk API batch size */
  CLERK_BATCH: 500,
  /** Asaas API page size */
  ASAAS_PAGE: 100,
  /** Default API page size */
  DEFAULT_PAGE: 100,
  /** R2 batch operation limit */
  R2_BATCH: 1_000,
  /** Recent jobs to show */
  RECENT_JOBS: 10,
} as const;

// ============================================================================
// R2 STORAGE
// ============================================================================

export const R2_CONFIG = {
  /** Thumbnail size (px) */
  THUMBNAIL_SIZE: 300,
  /** Presigned URL TTL: 1 hour (seconds) */
  URL_TTL_SEC: 3_600,
  /** Max presigned URL TTL: 24 hours (seconds) */
  MAX_URL_TTL_SEC: 86_400,
} as const;

// ============================================================================
// QUEUE CONFIG
// ============================================================================

export const QUEUE_CONFIG = {
  stencil: {
    attempts: 3,
    backoffDelay: 2_000,
    backoffType: 'exponential' as const,
    completedKeep: 100,
    completedAge: 86_400,      // 1 day (seconds)
    failedKeep: 50,
    failedAge: 7 * 86_400,    // 7 days (seconds)
    priority: 10,
  },
  enhance: {
    attempts: 2,
    backoffDelay: 3_000,
    backoffType: 'exponential' as const,
    completedKeep: 50,
    completedAge: 86_400,
    failedKeep: 25,
    failedAge: 7 * 86_400,
  },
  iaGen: {
    attempts: 2,
    backoffDelay: 3_000,
    backoffType: 'exponential' as const,
    completedKeep: 50,
    completedAge: 86_400,
    failedKeep: 25,
    failedAge: 7 * 86_400,
  },
  colorMatch: {
    attempts: 2,
    backoffDelay: 1_000,
    backoffType: 'fixed' as const,
    completedKeep: 25,
    completedAge: 12 * 3_600,   // 12 hours
    failedKeep: 10,
    failedAge: 3 * 86_400,     // 3 days
  },
} as const;

// ============================================================================
// WORKER CONCURRENCY
// ============================================================================

export const WORKER_CONCURRENCY = {
  STENCIL_DEFAULT: 5,
  ENHANCE_DEFAULT: 3,
  IA_GEN_DEFAULT: 3,
  COLOR_MATCH: 10,
  /** Stencil worker rate limiter */
  STENCIL_LIMITER: { max: 10, duration: 60_000 },
} as const;

// ============================================================================
// RETRY CONFIG
// ============================================================================

export const RETRY_CONFIG = {
  DEFAULT: {
    maxRetries: 3,
    initialDelay: 1_000,
    maxDelay: 10_000,
    backoffMultiplier: 2,
  },
  HTTP: {
    maxRetries: 3,
    initialDelay: 1_000,
    maxDelay: 5_000,
    backoffMultiplier: 2,
  },
  REDIS: {
    maxRetries: 5,
  },
} as const;

// ============================================================================
// AUTH & ADMIN
// ============================================================================

export const AUTH_LIMITS = {
  /** Activity cache max entries before purge */
  ACTIVITY_CACHE_MAX: 1_000,
} as const;
