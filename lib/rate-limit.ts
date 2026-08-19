interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

const CLEANUP_INTERVAL_MS = 60_000;
const STALE_THRESHOLD_MS = 300_000;

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > STALE_THRESHOLD_MS) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitConfig {
  maxTokens: number;
  refillRate: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  cleanup();

  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens - 1, lastRefill: now };
    buckets.set(key, bucket);
    return { allowed: true, retryAfterMs: 0 };
  }

  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / 1000) * config.refillRate;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + refill);

  if (bucket.tokens < 1) {
    const deficit = 1 - bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / config.refillRate) * 1000);
    return { allowed: false, retryAfterMs };
  }

  bucket.tokens -= 1;
  bucket.lastRefill = now;
  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "127.0.0.1";
}
