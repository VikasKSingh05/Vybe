import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RadioStore } from "@/lib/radio/store-interface";
import type { Song } from "@/types/music";

const { discoverMock } = vi.hoisted(() => ({ discoverMock: vi.fn() }));

vi.mock("@/lib/music/discover", () => ({
  discoverRandomSongs: (
    count: number,
    exclude: Set<string> = new Set(),
  ) => discoverMock(count, exclude),
}));

import {
  advanceStationState,
  applyReportedDuration,
  bootstrapStation,
  nextVersion,
  recordFailure,
} from "@/lib/radio/engine";
import { createRedisRadioStore } from "@/lib/radio/store-redis";
import { RADIO_ENGINE_CONFIG } from "@/lib/radio/config";
import type { StationState } from "@/lib/radio/types";

const SONGS: Song[] = ["a", "b", "c", "d"].map((id) => ({
  id,
  title: `Song ${id}`,
  artist: `Artist ${id}`,
  streamUrl: `https://audio.test/${id}.mp3`,
  provider: "jiosaavn",
}));

beforeEach(() => {
  discoverMock.mockReset();
  discoverMock.mockImplementation(
    async (_count: number, exclude: Set<string> = new Set()) =>
      SONGS.filter((song) => !exclude.has(song.id)),
  );
});

function state(overrides: Partial<StationState> = {}): StationState {
  return {
    stationId: "live",
    version: 1,
    status: "live",
    current: {
      refId: "jiosaavn:a",
      provider: "jiosaavn",
      trackId: "a",
      title: "Song a",
      artist: "Artist a",
      durationMs: 180_000,
    },
    startedAtMs: 1_000,
    queue: ["b", "c", "d"].map((id) => ({
      refId: `jiosaavn:${id}`,
      provider: "jiosaavn" as const,
      trackId: id,
      title: `Song ${id}`,
      artist: `Artist ${id}`,
      durationMs: 180_000,
    })),
    history: [],
    failedTracks: [],
    updatedAtMs: 1_000,
    ...overrides,
  };
}

describe("single live station engine", () => {
  it("bootstraps exactly one broadcast with a discovered current track", async () => {
    const boot = await bootstrapStation(5_000);
    expect(boot.stationId).toBe("live");
    expect(boot.status).toBe("live");
    expect(boot.version).toBe(1);
    expect(boot.current?.trackId).toBe("a");
  });

  it("keeps recently failed tracks out of rotation", async () => {
    const current = state();
    recordFailure(current, "jiosaavn:b", Date.now());

    const advanced = await advanceStationState(current, "recovery", Date.now());
    expect(advanced.current?.trackId).toBe("c");
    expect(advanced.failedTracks.map((f) => f.refId)).toContain("jiosaavn:b");
  });

  it("only bumps the version when the broadcast track changes", () => {
    const before = state();
    expect(nextVersion(before, { ...before })).toBe(1);
    expect(
      nextVersion(before, {
        ...before,
        current: { ...before.current!, refId: "jiosaavn:z", trackId: "z" },
      }),
    ).toBe(2);
  });

  it("applies a reported duration without changing the version", () => {
    const current = state();
    expect(applyReportedDuration(current, "jiosaavn:a", 214_000)).toBe(true);
    expect(current.current?.durationMs).toBe(214_000);
    expect(current.version).toBe(1);
    expect(applyReportedDuration(current, "jiosaavn:b", 200_000)).toBe(false);
  });

  it("expires cooldown entries after the configured window", async () => {
    const current = state({
      failedTracks: [
        {
          refId: "jiosaavn:b",
          failedAtMs: Date.now() - RADIO_ENGINE_CONFIG.failedTrackCooldownMs - 1,
        },
      ],
    });
    const advanced = await advanceStationState(current, "auto", Date.now());
    expect(advanced.current?.trackId).toBe("b");
  });
});

describe("memory radio store", () => {
  async function freshStore(): Promise<RadioStore> {
    vi.resetModules();
    const module = await import("@/lib/radio/store-memory");
    return module.memoryRadioStore;
  }

  it("advances once for a repeated skip with the same version", async () => {
    const store = await freshStore();
    const first = await store.reconcile();
    await store.advance("skip", first.version);
    await store.advance("skip", first.version);

    const after = await store.getStation();
    expect(after?.version).toBe(first.version + 1);
  });

  it("returns the current wire when a skip uses a stale version", async () => {
    const store = await freshStore();
    const first = await store.reconcile();
    const second = await store.advance("skip", first.version);

    expect(second.current?.refId).not.toBe(first.current?.refId);
    const stale = await store.advance("skip", first.version);
    expect(stale.current?.refId).toBe(second.current?.refId);
  });
});

describe("redis radio store CAS", () => {
  it("retries the transaction when WATCH is invalidated", async () => {
    let value: string | null = null;
    let invalid = false;
    let conflicts = 1;
    let execCalls = 0;

    const redis = {
      async get() {
        return value;
      },
      async set(_key: string, next: string) {
        value = next;
      },
      async watch() {
        invalid = false;
      },
      async unwatch() {},
      multi() {
        let pending = "";
        return {
          set(_key: string, next: string) {
            pending = next;
            if (conflicts > 0) {
              conflicts -= 1;
              invalid = true;
            }
            return this;
          },
          async exec() {
            execCalls += 1;
            if (invalid) return null;
            value = pending;
            return [[null, "OK"]];
          },
        };
      },
    };

    const store = createRedisRadioStore(redis);
    const wire = await store.advance("skip");
    expect(execCalls).toBe(2);
    expect(wire.current?.trackId).toBeTruthy();
    expect(wire.stationId).toBe("live");
  });
});
