/**
 * lib/rate-limit.ts
 *
 * In-memory sliding window rate limiter for Next.js middleware.
 * Works in Edge runtime (no Node.js APIs).
 *
 * NOTE: In multi-instance deployments (serverless/containers),
 * each instance has its own Map. For production, consider
 * Redis-backed rate limiting (e.g., @upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check and increment rate limit for a given key.
 * Returns { allowed: true } if within limit,
 * or { allowed: false, retryAfter } if exceeded.
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfter?: number; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  // Window expired or first request — reset
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  // Within window — increment
  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count };
  }

  // Exceeded
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, retryAfter, remaining: 0 };
}

/**
 * Cleanup expired entries periodically to prevent memory leaks.
 * Called automatically when rateLimit detects expired entries.
 */
export function cleanupStore(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

// Run cleanup every 5 minutes (only in long-lived processes)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupStore, 5 * 60 * 1000);
}

/* ============================================================
 * Preset configurations
 * ============================================================ */

/** General API: 100 requests per minute per IP */
export const API_GENERAL = { maxRequests: 100, windowMs: 60_000 };

/** Auth endpoints: 10 requests per minute per IP (brute-force protection) */
export const API_AUTH = { maxRequests: 10, windowMs: 60_000 };

/** Upload endpoints: 20 requests per minute per IP */
export const API_UPLOAD = { maxRequests: 20, windowMs: 60_000 };

/** Write endpoints (POST/PUT/DELETE): 30 requests per minute per IP */
export const API_WRITE = { maxRequests: 30, windowMs: 60_000 };