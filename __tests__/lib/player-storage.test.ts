import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadPlayerState, savePlayerState } from "@/lib/player-storage";
import type { PersistedPlayerState } from "@/lib/player-storage";

function makeState(
  overrides: Partial<PersistedPlayerState> = {},
): PersistedPlayerState {
  return {
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

  it("ignores stale vibe and queue fields from older payloads", () => {
    savePlayerState(makeState());
    const raw = window.localStorage.getItem("vybe.player.v1")!;
    const parsed = JSON.parse(raw);
    parsed.vibeId = "lofi";
    parsed.playlist = [{ title: "Stale", artist: "Track" }];
    parsed.currentIndex = 99;
    window.localStorage.setItem("vybe.player.v1", JSON.stringify(parsed));

    expect(loadPlayerState()).toEqual(makeState());
  });

  it("clamps volume into [0,1] and defaults isMuted to false", () => {
    savePlayerState(makeState({ volume: 7, isMuted: undefined as unknown as boolean }));
    expect(loadPlayerState()?.volume).toBe(1);
    expect(loadPlayerState()?.isMuted).toBe(false);
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

    expect(loadPlayerState()).toEqual(makeState());
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
