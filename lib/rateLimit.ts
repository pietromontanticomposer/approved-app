/**
 * Simple in-memory rate limiter.
 * NOTE: On serverless platforms (Vercel) each instance has its own memory,
 * so limits are per-instance. This is still effective as a first layer of
 * defense against abuse. For production at scale, replace the store with
 * an external KV (e.g. Upstash Redis).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Prune stale entries every 5 minutes to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check whether a key is within the rate limit.
 * @param key      Unique key (e.g. "signup:1.2.3.4")
 * @param max      Maximum requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  max: number = 10,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count, retryAfterMs: 0 };
}

/**
 * Extract the client IP from the request headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

/**
 * Rate limit presets for common use cases.
 */
export const LIMITS = {
  /** Auth endpoints (signup, check-email) — 10 req/min per IP */
  auth: { max: 10, windowMs: 60_000 },
  /** Invite creation — 20 req/min per user */
  invite: { max: 20, windowMs: 60_000 },
  /** Share link redemption — 5 req/hour per IP */
  shareRedeem: { max: 5, windowMs: 60 * 60_000 },
  /** Destructive admin operations — 5 req/5 min per IP */
  adminDestructive: { max: 5, windowMs: 5 * 60_000 },
} as const;
