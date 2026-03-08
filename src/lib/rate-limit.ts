const rateLimitStore = new Map<string, number[]>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((timestamps, key) => {
    const filtered = timestamps.filter((t) => now - t < 300_000);
    if (filtered.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, filtered);
    }
  });
}, 300_000).unref?.();

export function createRateLimiter({
  windowMs,
  maxRequests,
}: {
  windowMs: number;
  maxRequests: number;
}) {
  return {
    check(ip: string): { allowed: boolean; retryAfter?: number } {
      const now = Date.now();
      const key = `${ip}:${windowMs}:${maxRequests}`;
      const timestamps = rateLimitStore.get(key) ?? [];

      // Remove timestamps outside the window
      const windowStart = now - windowMs;
      const valid = timestamps.filter((t) => t > windowStart);

      if (valid.length >= maxRequests) {
        const oldestInWindow = valid[0];
        const retryAfter = Math.ceil(
          (oldestInWindow + windowMs - now) / 1000
        );
        return { allowed: false, retryAfter };
      }

      valid.push(now);
      rateLimitStore.set(key, valid);
      return { allowed: true };
    },
  };
}
