import type { Context, Next } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter.
 * Limits requests per IP per minute.
 */
export function rateLimit(maxRequests = 10, windowMs = 60 * 1000) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') ||
               c.req.header('x-real-ip') ||
               'unknown';

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt < now) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (entry.count >= maxRequests) {
      return c.json(
        { error: { code: 'RATE_LIMIT', message: '请求过于频繁，请稍后再试' } },
        429
      );
    }

    entry.count++;
    await next();
  };
}
