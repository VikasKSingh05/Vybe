import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useAudioElement } from "@/hooks/useAudioElement";

type Listener = (() => void) | null;

class AudioMock {
  src = "";
  currentTime = 0;
  volume = 0.9;
  muted = false;
  preload = "";
  readyState = 0;
  paused = true;
  private listeners: Record<string, Listener> = {};

  constructor() {
    createdAudios.push(this);
  }

  addEventListener(type: string, cb: () => void) {
    this.listeners[type] = cb;
  }
  load() {
    this.readyState = 4;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  setAttribute(_k: string, _v: string) {}
  getAttribute(k: string) {
    return k === "data-volume" ? String(this.volume) : null;
  }
  removeAttribute() {}
  removeEventListener(_t: string) {}
}

const createdAudios: AudioMock[] = [];

describe("useAudioElement active-element handling", () => {
  beforeEach(() => {
    createdAudios.length = 0;
    vi.stubGlobal("Audio", AudioMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    cleanup();
  });

  it("exposes the primary element as active initially", () => {
    const { result } = renderHook(() => useAudioElement());
    expect(createdAudios).toHaveLength(2);
    expect(result.current.getActive()).toBe(createdAudios[0]);
  });

  it("flips getActive() to the secondary element after a crossfade", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAudioElement());
    const primary = createdAudios[0];
    const secondary = createdAudios[1];

    act(() => {
      result.current.crossfadeTo("http://example.com/next.mp3", 100);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // After the crossfade the *secondary* node is the audible one.
    expect(result.current.getActive()).toBe(secondary);
    // The previous element is stopped and reset, so it can't keep playing.
    expect(primary.paused).toBe(true);
    expect(primary.currentTime).toBe(0);
  });

  it("pauseAll() stops and resets both audio nodes", () => {
    const { result } = renderHook(() => useAudioElement());
    const primary = createdAudios[0];
    const secondary = createdAudios[1];
    primary.paused = false;
    secondary.paused = false;

    act(() => {
      result.current.pauseAll();
    });

    expect(primary.paused).toBe(true);
    expect(secondary.paused).toBe(true);
    expect(primary.currentTime).toBe(0);
    expect(secondary.currentTime).toBe(0);
  });
});
