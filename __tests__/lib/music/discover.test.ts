import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Song } from "@/types/music";

const searchMock = vi.fn<(query: string) => Promise<Song[]>>();

vi.mock("@/lib/music/jiosaavn", () => ({
  searchJioSaavnSongs: (query: string) => searchMock(query),
}));

import { discoverSongsForVibe, discoverRandomSongs } from "@/lib/music/discover";

function song(id: string, title = id, artist = "Artist"): Song {
  return {
    id,
    title,
    artist,
    streamUrl: `https://audio.test/${id}.mp3`,
    provider: "jiosaavn",
  };
}

describe("discoverSongsForVibe", () => {
  beforeEach(() => {
    searchMock.mockReset();
  });

  it("caps results at the requested count and drops stream-less songs", async () => {
    searchMock.mockResolvedValue([
      song("a"),
      song("b"),
      song("c"),
      { id: "no-stream", title: "No Stream", artist: "X", provider: "jiosaavn" },
    ]);

    const result = await discoverSongsForVibe("lofi", 2);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.streamUrl)).toBe(true);
  });

  it("excludes already-seen ids", async () => {
    searchMock.mockResolvedValue([song("a"), song("b"), song("c")]);

    const result = await discoverSongsForVibe("bollywood", 5, new Set(["a", "b"]));
    expect(result.map((s) => s.id)).toEqual(["c"]);
  });

  it("de-duplicates songs that share a title and artist", async () => {
    searchMock.mockResolvedValue([
      song("a", "Same", "One"),
      song("b", "Same", "One"),
      song("c", "Different", "Two"),
    ]);

    const result = await discoverSongsForVibe("indie", 5);
    expect(result.map((s) => s.id).sort()).toEqual(["a", "c"]);
  });

  it("queries a vibe-specific seed term", async () => {
    searchMock.mockResolvedValue([song("a")]);

    await discoverSongsForVibe("phonk", 3);

    expect(searchMock).toHaveBeenCalledTimes(1);
    const query = searchMock.mock.calls[0][0];
    expect(["phonk music", "drift phonk", "phonk beats", "memphis rap"]).toContain(query);
  });

  it("returns an empty list when the upstream search fails", async () => {
    searchMock.mockRejectedValue(new Error("upstream down"));

    const result = await discoverSongsForVibe("chill", 5);
    expect(result).toEqual([]);
  });
});

describe("discoverRandomSongs", () => {
  beforeEach(() => {
    searchMock.mockReset();
  });

  it("delegates to the broad random seed pool", async () => {
    searchMock.mockResolvedValue([song("a"), song("b")]);

    const result = await discoverRandomSongs(2);
    expect(result.map((s) => s.id).sort()).toEqual(["a", "b"]);
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it("honours the exclude set", async () => {
    searchMock.mockResolvedValue([song("a"), song("b")]);

    const result = await discoverRandomSongs(5, new Set(["a"]));
    expect(result.map((s) => s.id)).toEqual(["b"]);
  });
});
