const DEFAULT_DURATION_MS = 3 * 60_000;
const MIN_DURATION_MS = 15_000;
const MAX_DURATION_MS = 20 * 60_000;

/** Normalize song duration to milliseconds (accepts seconds or ms). */
export function normalizeDurationMs(raw: number | undefined | null): number {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_DURATION_MS;
  }
  let ms = raw;
  if (ms < 600) {
    ms = Math.round(ms * 1000);
  }
  if (ms < MIN_DURATION_MS) return MIN_DURATION_MS;
  if (ms > MAX_DURATION_MS) return MAX_DURATION_MS;
  return Math.round(ms);
}
