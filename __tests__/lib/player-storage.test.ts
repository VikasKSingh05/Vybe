import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadPlayerState,
  savePlayerState,
} from "@/lib/player-storage";
import type { PersistedPlayerState } from "@/lib/player-storage";

function makeState(overrides: Partial<PersistedPlayerState> = {}): PersistedPlayerState {
  return {
    vibeId: "bollywood",
    playlist: [
      { jiosaavnId: "s1", title: "Song One", artist: "A" },
      { jiosaavnId: "s2", title: "Song Two", artist: "B" },
    ],
    currentIndex: 1,
    volume: 0.5,
    isMuted: false,
    crossfadeEnabled: true,
    repeatMode: "all",
    shuffle: false,
    ...overrides,
  };
}

describe("player-storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(loadPlayerState()).toBeNull();
  });

  it("round-trips a saved state", () => {
    const state = makeState();
    savePlayerState(state);
    expect(loadPlayerState()).toEqual(state);
  });

  it("rejects a corrupted payload", () => {
    window.localStorage.setItem("vybe.player.v1", "{not json");
    expect(loadPlayerState()).toBeNull();
  });

  it("rejects an unknown vibeId", () => {
    savePlayerState(makeState());
    const raw = window.localStorage.getItem("vybe.player.v1")!;
    const parsed = JSON.parse(raw);
    parsed.vibeId = "jazz";
    window.localStorage.setItem("vybe.player.v1", JSON.stringify(parsed));
    expect(loadPlayerState()).toBeNull();
  });

  it("rejects an empty playlist", () => {
    savePlayerState(makeState({ playlist: [] }));
    expect(loadPlayerState()).toBeNull();
  });

  it("drops malformed entries but keeps valid ones", () => {
    savePlayerState(makeState());
    const raw = window.localStorage.getItem("vybe.player.v1")!;
    const parsed = JSON.parse(raw);
    parsed.playlist.push({ title: 42 }, null);
    window.localStorage.setItem("vybe.player.v1", JSON.stringify(parsed));
    const restored = loadPlayerState();
    expect(restored?.playlist).toHaveLength(2);
  });

  it("clamps currentIndex into range and coerces bad numbers", () => {
    savePlayerState(makeState({ currentIndex: 99 }));
    expect(loadPlayerState()?.currentIndex).toBe(1);

    savePlayerState(makeState({ currentIndex: Number.NaN }));
    expect(loadPlayerState()?.currentIndex).toBe(0);
  });

  it("clamps volume into [0,1] and defaults isMuted to false", () => {
    savePlayerState(makeState({ volume: 7, isMuted: undefined as unknown as boolean }));
    const restored = loadPlayerState();
    expect(restored?.volume).toBe(1);
    expect(restored?.isMuted).toBe(false);
  });

  it("round-trips crossfade, repeat and shuffle settings", () => {
    const state = makeState({
      crossfadeEnabled: false,
      repeatMode: "one",
      shuffle: true,
    });
    savePlayerState(state);
    expect(loadPlayerState()).toEqual(state);
  });

  it("defaults missing settings to safe values", () => {
    savePlayerState(makeState({}));
    const raw = window.localStorage.getItem("vybe.player.v1")!;
    const parsed = JSON.parse(raw);
    delete parsed.crossfadeEnabled;
    delete parsed.repeatMode;
    delete parsed.shuffle;
    window.localStorage.setItem("vybe.player.v1", JSON.stringify(parsed));

    const restored = loadPlayerState();
    expect(restored?.crossfadeEnabled).toBe(true);
    expect(restored?.repeatMode).toBe("all");
    expect(restored?.shuffle).toBe(false);
  });

  it("rejects an invalid repeatMode and defaults to all", () => {
    savePlayerState(makeState({ repeatMode: "all" }));
    const raw = window.localStorage.getItem("vybe.player.v1")!;
    const parsed = JSON.parse(raw);
    parsed.repeatMode = "sometimes";
    window.localStorage.setItem("vybe.player.v1", JSON.stringify(parsed));
    expect(loadPlayerState()?.repeatMode).toBe("all");
  });
});

describe("player-storage timers", () => {
  it("savePlayerState does not throw under quota pressure", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
    expect(() => savePlayerState(makeState())).not.toThrow();
    setItem.mockRestore();
  });
});
