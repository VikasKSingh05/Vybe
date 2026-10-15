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
  // Record the refill point BEFORE deciding. If we only advanced it on the
  // allowed path, a denied request would re-apply the same elapsed time on the
  // next call and over-refill the bucket.
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const deficit = 1 - bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / config.refillRate) * 1000);
    return { allowed: false, retryAfterMs };
  }

  bucket.tokens -= 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIp(request: Request): string {
  // Prefer the address the trusted edge proxy recorded directly. Fall back to
  // the right-most X-Forwarded-For hop (the one our own proxy appended); the
  // left-most value is client-controlled and must never be trusted.
  const real = request.headers.get("x-real-ip");
  if (real?.trim()) return real.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return "127.0.0.1";
}
