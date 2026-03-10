/**
 * Centralized timeout & duration constants
 *
 * All time values in milliseconds unless otherwise noted.
 */

// ============================================================================
// DURATIONS (ms)
// ============================================================================

export const DURATIONS = {
  /** 1 second */
  SECOND: 1_000,
  /** 1 minute */
  MINUTE: 60_000,
  /** 1 hour */
  HOUR: 3_600_000,
  /** 1 day */
  DAY: 86_400_000,
  /** 7 days */
  WEEK: 7 * 86_400_000,
  /** 30 days */
  MONTH: 30 * 86_400_000,
} as const;

// ============================================================================
// DURATIONS IN SECONDS (for BullMQ, Redis, R2)
// ============================================================================

export const DURATIONS_SEC = {
  MINUTE: 60,
  HOUR: 3_600,
  DAY: 86_400,
  WEEK: 7 * 86_400,
  MONTH: 30 * 86_400,
} as const;

// ============================================================================
// CACHE TTL (ms)
// ============================================================================

export const CACHE_TTL = {
  /** Default cache: 5 minutes */
  DEFAULT: 5 * 60_000,
  /** Short cache: 1 minute */
  SHORT: 60_000,
  /** Admin stats: 1 hour */
  ADMIN_STATS: 3_600_000,
  /** Settings: 24 hours */
  SETTINGS: 86_400_000,
  /** Presigned URLs: 55 minutes (just under 1h expiry) */
  PRESIGNED_URL: 55 * 60_000,
} as const;

// ============================================================================
// TIMEOUTS (ms)
// ============================================================================

export const TIMEOUTS = {
  /** Redis command timeout */
  REDIS_COMMAND: 10_000,
  /** Redis connect timeout */
  REDIS_CONNECT: 10_000,
  /** API health check */
  HEALTH_CHECK: 5_000,
  /** Worker graceful shutdown */
  WORKER_SHUTDOWN: 10_000,
  /** Worker health check interval */
  WORKER_HEALTH_CHECK: 60_000,
  /** Activity throttle window (15 min) */
  ACTIVITY_THROTTLE: 15 * 60_000,
  /** Memory cache cleanup interval */
  CACHE_CLEANUP: 60_000,
  /** DB idle connection timeout (seconds) */
  DB_IDLE_SEC: 20,
  /** DB connection timeout (seconds) */
  DB_CONNECT_SEC: 10,
} as const;

// ============================================================================
// DATA RETENTION (days)
// ============================================================================

export const RETENTION_DAYS = {
  /** Webhook data retention */
  WEBHOOKS: 30,
  /** AI usage logs */
  AI_USAGE: 90,
  /** Activity logs */
  ACTIVITY_LOGS: 90,
  /** IP tracking data */
  IP_TRACKING: 60,
} as const;
