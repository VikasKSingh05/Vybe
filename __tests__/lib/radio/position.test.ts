import { describe, expect, it } from "vitest";
import { expectedPositionMs, shouldAdvanceTrack } from "@/lib/radio/position";
import type { StationState } from "@/lib/radio/types";

function state(
  partial: Partial<StationState> & Pick<StationState, "startedAtMs" | "current">,
): StationState {
  return {
    stationId: "live",
    version: 1,
    status: "live",
    queue: [],
    history: [],
    failedTracks: [],
    updatedAtMs: Date.now(),
    ...partial,
  };
}

describe("radio position", () => {
  it("computes expected position from server clock", () => {
    const now = 1_000_000;
    const s = state({
      startedAtMs: now - 90_000,
      current: {
        refId: "jiosaavn:a",
        provider: "jiosaavn",
        trackId: "a",
        title: "T",
        artist: "A",
        durationMs: 240_000,
      },
    });
    expect(expectedPositionMs(s, now)).toBe(90_000);
  });

  it("clamps position to track duration", () => {
    const now = 1_000_000;
    const s = state({
      startedAtMs: now - 300_000,
      current: {
        refId: "jiosaavn:a",
        provider: "jiosaavn",
        trackId: "a",
        title: "T",
        artist: "A",
        durationMs: 180_000,
      },
    });
    expect(expectedPositionMs(s, now)).toBe(180_000);
  });

  it("detects when a track should advance", () => {
    const now = 2_000_000;
    const s = state({
      startedAtMs: now - 181_000,
      current: {
        refId: "jiosaavn:a",
        provider: "jiosaavn",
        trackId: "a",
        title: "T",
        artist: "A",
        durationMs: 180_000,
      },
    });
    expect(shouldAdvanceTrack(s, now)).toBe(true);
  });
});
