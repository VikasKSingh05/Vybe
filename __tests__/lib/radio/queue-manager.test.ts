import { describe, expect, it } from "vitest";
import { pickNextTrack, seedCandidates } from "@/lib/radio/queue-manager";
import type { StationTrack } from "@/lib/radio/types";

function track(id: string, artist = "Artist"): StationTrack {
  return {
    refId: `jiosaavn:${id}`,
    provider: "jiosaavn",
    trackId: id,
    title: `Song ${id}`,
    artist,
    durationMs: 180_000,
  };
}

describe("radio queue manager", () => {
  it("avoids duplicate and cooling-down ref ids in selection", () => {
    const candidates = [track("a"), track("b"), track("c")];
    const picked = pickNextTrack(candidates, {
      queueRefIds: new Set(["jiosaavn:a"]),
      historyRefIds: new Set(),
      coolingDownRefIds: new Set(["jiosaavn:b"]),
      recentTitleArtist: new Set(),
    });
    expect(picked?.trackId).toBe("c");
  });

  it("mixes curated seeds from every vibe into one pool", () => {
    const seeds = seedCandidates();
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds[0].trackId).toBeTruthy();
  });
});
