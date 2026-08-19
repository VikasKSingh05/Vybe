import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request", () => {
    const result = rateLimit("test:key1", { maxTokens: 3, refillRate: 1 });
    expect(result.allowed).toBe(true);
  });

  it("denies after exhausting tokens", () => {
    const key = "test:key2";
    const config = { maxTokens: 2, refillRate: 1 };

    rateLimit(key, config);
    rateLimit(key, config);
    const result = rateLimit(key, config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("refills tokens over time", () => {
    const key = "test:key3";
    const config = { maxTokens: 1, refillRate: 1 };

    rateLimit(key, config);
    const denied = rateLimit(key, config);
    expect(denied.allowed).toBe(false);

    vi.advanceTimersByTime(1000);

    const allowed = rateLimit(key, config);
    expect(allowed.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("returns x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("returns x-real-ip header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "9.10.11.12" },
    });
    expect(getClientIp(request)).toBe("9.10.11.12");
  });

  it("falls back to 127.0.0.1", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("127.0.0.1");
  });
});
