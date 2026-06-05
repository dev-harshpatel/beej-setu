/**
 * In-memory sliding-window rate limiter.
 *
 * Limitations: resets on server restart; not shared across multiple instances.
 * Sufficient for a single-server deployment. Replace with Upstash or Redis
 * if the app moves to a distributed/serverless setup.
 */

interface WindowEntry {
  timestamps: number[]; // epoch-ms of each attempt within the window
}

const store = new Map<string, WindowEntry>();

// Sweep stale keys every 5 minutes to avoid unbounded memory growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 15 * 60 * 1000;
    for (const [key, entry] of store.entries()) {
      const fresh = entry.timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) {
        store.delete(key);
      } else {
        entry.timestamps = fresh;
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest attempt falls outside the window (only set when blocked) */
  retryAfterSeconds?: number;
}

/**
 * Check and record an attempt from `key`.
 *
 * @param key       Identifier to rate-limit on (e.g. IP address)
 * @param limit     Maximum attempts allowed within the window
 * @param windowMs  Window size in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(key) ?? { timestamps: [] };
  // Drop timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    store.set(key, entry);
    return { allowed: false, retryAfterSeconds };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true };
}
