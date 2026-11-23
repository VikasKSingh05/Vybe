import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlayer } from "@/hooks/usePlayer";
import type { Song } from "@/types/music";
import type { StationTrack, StationWire } from "@/lib/radio/types";

interface MockAudio {
  _src: string;
  src: string;
  currentTime: number;
  volume: number;
  duration: number | undefined;
  error: { code: number } | null;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  setAttribute: ReturnType<typeof vi.fn>;
  getAttribute: ReturnType<typeof vi.fn>;
  removeAttribute: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  fire: (type: string) => void;
  listeners: Map<string, ((e?: unknown) => void)[]>;
}

function makeAudio(): MockAudio {
  const el = {
    _src: "",
    currentTime: 0,
    volume: 1,
    duration: undefined,
    error: null,
    listeners: new Map<string, ((e?: unknown) => void)[]>(),
    play: vi.fn().mockImplementation(() => Promise.resolve()),
    pause: vi.fn(),
    load: vi.fn(),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(() => null),
    removeAttribute: vi.fn(function (this: MockAudio, name: string) {
      if (name === "src") this._src = "";
    }),
    addEventListener: vi.fn(function (
      this: MockAudio,
      type: string,
      fn: (e?: unknown) => void,
    ) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
    }),
    removeEventListener: vi.fn(),
    fire(this: MockAudio, type: string) {
      (this.listeners.get(type) ?? []).forEach((fn) => fn?.());
    },
  } as MockAudio;
  Object.defineProperty(el, "src", {
    get(this: MockAudio) {
      return this._src;
    },
    set(this: MockAudio, v: string) {
      this._src = v;
    },
    configurable: true,
  });
  return el;
}

function song(id: string, duration = 180): Song {
  return {
    id,
    title: `Song ${id}`,
    artist: `Artist ${id}`,
    streamUrl: `https://audio.test/${id}.mp3`,
    duration,
    provider: "jiosaavn",
  };
}

function track(id: string, durationMs = 180_000): StationTrack {
  return {
    refId: `jiosaavn:${id}`,
    provider: "jiosaavn",
    trackId: id,
    title: `Song ${id}`,
    artist: `Artist ${id}`,
    durationMs,
  };
}

function wire(
  version: number,
  currentId: string,
  queueIds: string[],
  expectedPositionMs = 0,
  currentDurationMs = 180_000,
): StationWire {
  const now = 1_000_000;
  return {
    stationId: "live",
    version,
    status: "live",
    current: track(currentId, currentDurationMs),
    startedAtMs: now,
    queue: queueIds.map((id) => track(id)),
    history: [],
    failedTracks: [],
    updatedAtMs: now,
    serverNowMs: now,
    expectedPositionMs,
  };
}

let audioInstances: MockAudio[] = [];
let originalAudio: typeof Audio;
let originalFetch: typeof fetch;
let currentWire: StationWire;
let songDurations: Record<string, number>;
let durationReports: Array<{ refId: string; durationMs: number }>;

function primary(): MockAudio {
  return audioInstances[0];
}

function waitFor(fn: () => boolean, timeout = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      try {
        if (fn()) return resolve();
      } catch {}
      if (Date.now() - start > timeout) return reject(new Error("waitFor timeout"));
      setTimeout(tick, 5);
    };
    tick();
  });
}

function response(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

function advanceWire(): StationWire {
  const queue = [...currentWire.queue];
  const next = queue.shift() ?? track(`r${currentWire.version + 1}`);
  currentWire = {
    ...currentWire,
    version: currentWire.version + 1,
    current: next,
    queue,
    startedAtMs: Date.now(),
    history: [...currentWire.history, currentWire.current?.refId ?? ""],
    expectedPositionMs: 0,
  };
  return currentWire;
}

describe("usePlayer shared VYBE LIVE", () => {
  beforeAll(() => {
    originalAudio = globalThis.Audio;
    originalFetch = globalThis.fetch;
  });

  beforeEach(() => {
    window.localStorage.clear();
    audioInstances = [];
    currentWire = wire(1, "a", ["b", "c"]);
    songDurations = {};
    durationReports = [];

    globalThis.Audio = class {
      constructor() {
        const el = makeAudio();
        audioInstances.push(el);
        return el;
      }
    } as unknown as typeof Audio;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/radio/duration")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          refId?: string;
          durationMs?: number;
        };
        if (body.refId && body.durationMs) {
          durationReports.push({ refId: body.refId, durationMs: body.durationMs });
          if (currentWire.current?.refId === body.refId) {
            currentWire = {
              ...currentWire,
              current: { ...currentWire.current, durationMs: body.durationMs },
            };
          }
        }
        return response(currentWire);
      }

      if (url.includes("/api/radio/skip") || url.includes("/api/radio/complete") || url.includes("/api/radio/report")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { version?: number };
        if (body.version != null && body.version !== currentWire.version) {
          return response(currentWire);
        }
        return response(advanceWire());
      }

      if (url.startsWith("/api/radio")) {
        return response(currentWire);
      }

      const match = url.match(/\/api\/music\/song\/([^/?]+)/);
      const id = match ? decodeURIComponent(match[1]) : "a";
      return response(song(id, songDurations[id] ?? 180));
    });
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
    globalThis.fetch = originalFetch;
    audioInstances = [];
  });

  function setup() {
    return renderHook(() => usePlayer({ autoPlay: true }));
  }

  async function waitForSync(host: ReturnType<typeof setup>) {
    await waitFor(() => host.result.current.queueLength === 3);
  }

  it("builds the playlist from the shared wire and plays the current track", async () => {
    const host = setup();
    await waitForSync(host);

    expect(primary().src).toBe("https://audio.test/a.mp3");
    expect(primary().play).toHaveBeenCalled();
    expect(host.result.current.track.title).toBe("Song a");
    expect(host.result.current.isLiveStation).toBe(true);
  });

  it("seeks to the server-reported position when metadata loads", async () => {
    currentWire = wire(1, "a", ["b", "c"], 45_000);
    const host = setup();
    await waitForSync(host);

    await act(async () => {
      primary().fire("loadedmetadata");
    });
    expect(primary().currentTime).toBe(45);
  });

  it("skips once for a double-click with the same version", async () => {
    const host = setup();
    await waitForSync(host);

    await act(async () => {
      host.result.current.next();
      host.result.current.next();
      await waitFor(() => currentWire.version === 2);
    });

    expect(currentWire.version).toBe(2);
    expect(currentWire.current?.trackId).toBe("b");
    await waitFor(() => host.result.current.track.title === "Song b");
    expect(host.result.current.track.title).toBe("Song b");
  });

  it("keeps one fixed live-station identity across resyncs", async () => {
    const host = setup();
    await waitForSync(host);
    const src = primary().src;
    const pauses = primary().pause.mock.calls.length;

    await act(async () => {
      await host.result.current.refreshWire();
    });

    expect(host.result.current.isLiveStation).toBe(true);
    expect(host.result.current.theme.label).toBe("VYBE LIVE");
    expect(primary().src).toBe(src);
    expect(primary().pause.mock.calls.length).toBe(pauses);
  });

  it("reports a natural end and follows the new broadcast track", async () => {
    const host = setup();
    await waitForSync(host);

    await act(async () => {
      primary().fire("ended");
      await waitFor(() => currentWire.version === 2);
    });

    await waitFor(() => host.result.current.track.title === "Song b");
    expect(host.result.current.track.title).toBe("Song b");
  });

  it("reports a failed stream and recovers to the next track", async () => {
    const host = setup();
    await waitForSync(host);
    primary().error = { code: 2 };

    await act(async () => {
      primary().fire("error");
      await waitFor(() => currentWire.version === 2);
    });

    await waitFor(() => host.result.current.track.title === "Song b");
    expect(host.result.current.track.title).toBe("Song b");
  });

  it("reports the real stream duration when discovery used a fallback", async () => {
    songDurations.a = 210;
    const host = setup();
    await waitForSync(host);

    await waitFor(() => durationReports.length > 0);
    expect(durationReports[0]).toMatchObject({ refId: "jiosaavn:a", durationMs: 210_000 });
  });

  it("ignores an identical poll instead of reloading the stream", async () => {
    const host = setup();
    await waitForSync(host);
    const loads = primary().load.mock.calls.length;

    await act(async () => {
      await host.result.current.refreshWire();
    });

    expect(primary().load.mock.calls.length).toBe(loads);
  });

  it("inserts listener-added songs after the current broadcast track", async () => {
    const host = setup();
    await waitForSync(host);

    act(() => {
      host.result.current.addToQueue(
        { jiosaavnId: "x", title: "Song x", artist: "Artist x" },
        song("x"),
        true,
      );
    });

    await waitFor(() => primary().src === "https://audio.test/x.mp3");
    expect(host.result.current.queueItems[1]?.jiosaavnId).toBe("x");
  });
});
