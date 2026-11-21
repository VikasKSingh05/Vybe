import { describe, it, expect } from "vitest";
import { normalizeForMatch, rankAndDedupeSongs, relevanceScore } from "@/lib/music/ranking";
import type { Song } from "@/types/music";

function song(id: string, title: string, artist: string, streamUrl?: string): Song {
  return { id, title, artist, streamUrl, provider: "jiosaavn" };
}

describe("normalizeForMatch", () => {
  it("folds case, accents, and punctuation into comparable tokens", () => {
    expect(normalizeForMatch("  Émílo!-- Forever  ")).toBe("emilo forever");
  });
});

describe("relevanceScore", () => {
  it("ranks exact and prefix title matches above token overlap", () => {
    const exact = relevanceScore(song("1", "Phonk", "Drift"), "phonk");
    const prefix = relevanceScore(song("2", "Phonk King", "Drift"), "phonk");
    const artistOnly = relevanceScore(song("3", "Unknown", "Phonk Kids"), "phonk");
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(artistOnly);
  });
});

describe("rankAndDedupeSongs", () => {
  it("deduplicates by id and normalized title/artist", () => {
    const ranked = rankAndDedupeSongs(
      [
        song("a", "Same Song", "One Artist", "https://audio.test/a"),
        song("a", "Different Title", "Other", "https://audio.test/a2"),
        song("b", "SAME  SONG!", "one artist", "https://audio.test/b"),
        song("c", "Another", "Someone", "https://audio.test/c"),
      ],
      "same song",
    );
    expect(ranked.map((item) => item.id)).toEqual(["a", "c"]);
  });

  it("puts playable results first even when an unplayable row is more relevant", () => {
    const ranked = rankAndDedupeSongs(
      [
        song("bad", "Phonk", "Artist"),
        song("good", "Phonk Remix", "Artist", "https://audio.test/good"),
      ],
      "phonk",
    );
    expect(ranked[0]?.id).toBe("good");
  });
});
