import { afterEach, describe, expect, it, vi } from "vitest";

const redis = vi.hoisted(() => ({
  on: vi.fn(),
  disconnect: vi.fn(),
  get: vi.fn().mockRejectedValue(new Error("redis down")),
  set: vi.fn().mockRejectedValue(new Error("redis down")),
  watch: vi.fn().mockRejectedValue(new Error("redis down")),
  unwatch: vi.fn().mockResolvedValue("OK"),
  exec: vi.fn().mockResolvedValue(null),
}));

vi.mock("ioredis", () => ({
  default: class {
    on = redis.on;
    disconnect = redis.disconnect;
    get = redis.get;
    set = redis.set;
    watch = redis.watch;
    unwatch = redis.unwatch;
    multi() {
      return { set: redis.set, exec: redis.exec };
    }
  },
}));

const originalRedisUrl = process.env.REDIS_URL;

describe("radio store factory", () => {
  afterEach(() => {
    if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedisUrl;
    vi.restoreAllMocks();
  });

  it("keeps serving the broadcast when Redis is unreachable", async () => {
    process.env.REDIS_URL = "redis://127.0.0.1:1";
    vi.resetModules();
    const { getRadioStore } = await import("@/lib/radio/store-factory");

    const first = await getRadioStore().reconcile();
    const second = await getRadioStore().reconcile();

    expect(first.stationId).toBe("live");
    expect(second.stationId).toBe("live");
    expect(redis.watch).toHaveBeenCalledTimes(1);
  });
});
