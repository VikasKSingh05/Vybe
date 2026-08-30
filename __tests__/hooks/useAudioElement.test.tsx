import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioElement } from "@/hooks/useAudioElement";

interface MockAudio {
  _src: string;
  src: string;
  preload: string;
  readyState: number;
  currentTime: number;
  volume: number;
  error: { code: number } | null;
  play: MockFn;
  pause: MockFn;
  load: MockFn;
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
  removeAttribute: MockFn;
  addEventListener: MockFn;
  removeEventListener: MockFn;
  fire: (type: string) => void;
  listeners: Map<string, ((e?: unknown) => void)[]>;
}

type MockFn = ReturnType<typeof vi.fn> & ((...args: never[]) => unknown);

function makeAudio(): MockAudio {
  const el = {
    _src: "",
    src: "",
    preload: "auto",
    readyState: 0,
    currentTime: 0,
    volume: 1,
    error: null,
    listeners: new Map<string, ((e?: unknown) => void)[]>(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(() => null),
    removeAttribute: vi.fn(),
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

let instances: MockAudio[] = [];
let originalAudio: typeof Audio;

function primary(): MockAudio {
  return instances[0];
}
function secondary(): MockAudio {
  return instances[1];
}

describe("useAudioElement", () => {
  beforeAll(() => {
    originalAudio = globalThis.Audio;
  });

  beforeEach(() => {
    instances = [];
    globalThis.Audio = class {
      constructor() {
        const el = makeAudio();
        instances.push(el);
        return el;
      }
    } as unknown as typeof Audio;
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
    instances = [];
  });

  it("creates exactly two audio elements (primary + crossfade secondary)", () => {
    const { unmount } = renderHook(() => useAudioElement());
    expect(instances.length).toBe(2);
    unmount();
  });

  it("getActiveAudio returns the primary element before any crossfade", () => {
    const { result } = renderHook(() => useAudioElement());
    expect(result.current.getActiveAudio()).toBe(primary());
  });

  it("stopPlayback pauses and clears BOTH elements and re-centers on primary", () => {
    const { result } = renderHook(() => useAudioElement());
    act(() => {
      primary().fire("play");
      result.current.stopPlayback();
    });

    expect(primary().pause).toHaveBeenCalled();
    expect(secondary().pause).toHaveBeenCalled();
    expect(primary().removeAttribute).toHaveBeenCalledWith("src");
    expect(secondary().removeAttribute).toHaveBeenCalledWith("src");
    expect(primary().load).toHaveBeenCalled();
    expect(secondary().load).toHaveBeenCalled();
    // recentered on primary
    expect(result.current.getActiveAudio()).toBe(primary());
  });

  it("applyVolume sets volume on the active element", () => {
    const { result } = renderHook(() => useAudioElement());
    act(() => {
      result.current.applyVolume(0.3);
    });
    expect(primary().volume).toBe(0.3);
    expect(secondary().volume).toBe(0.3);
  });

  it("completing a crossfade hands playback to the secondary element", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAudioElement());
      const a = primary();
      const b = secondary();
      a.readyState = 2;
      b.readyState = 2;
      a.setAttribute("data-volume", "0.75");

      act(() => {
        a.fire("play"); // outgoing is active & playing
      });

      await act(async () => {
        result.current.crossfadeTo("http://b", 60);
        // let the play() continuation resolve
        await Promise.resolve();
        // advance the full fade (20 steps * 3ms = 60ms)
        await vi.advanceTimersByTimeAsync(60);
      });

      // After a completed crossfade the active element is the secondary.
      expect(result.current.getActiveAudio()).toBe(b);
      expect(a.pause).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stopPlayback during a crossfade prevents the old source from completing", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAudioElement());
      const a = primary();
      const b = secondary();
      a.readyState = 2;
      b.readyState = 2;
      a.setAttribute("data-volume", "0.75");

      act(() => {
        a.fire("play");
        result.current.crossfadeTo("http://b", 60);
        result.current.stopPlayback(); // cancel while fade is in flight
      });

      await act(async () => {
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(60);
      });

      // The cancelled crossfade must NOT have promoted secondary; we stay on primary.
      expect(result.current.getActiveAudio()).toBe(a);
      expect(b.removeAttribute).toHaveBeenCalledWith("src");
    } finally {
      vi.useRealTimers();
    }
  });
});
