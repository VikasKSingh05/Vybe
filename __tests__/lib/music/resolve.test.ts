import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveSong } from "@/lib/music/resolve";
import type { PlaylistEntry } from "@/data/playlists";
import type { Song } from "@/types/music";

const mockSong: Song = {
  id: "test123",
  title: "Test Song",
  artist: "Test Artist",
  streamUrl: "https://example.com/stream",
  artwork: "https://example.com/art.jpg",
  duration: 180,
  provider: "jiosaavn",
};

function makeEntry(overrides: Partial<PlaylistEntry> = {}): PlaylistEntry {
  return {
    title: "Test Song",
    artist: "Test Artist",
    jiosaavnId: "test123",
    ...overrides,
  };
}

describe("resolveSong", () => {
  let cache: Map<string, Song>;

  beforeEach(() => {
    cache = new Map();
    vi.restoreAllMocks();
  });

  it("returns cached song if available", async () => {
    const entry = makeEntry();
    cache.set("test123", mockSong);

    const result = await resolveSong(cache, entry);
    expect(result).toEqual(mockSong);
  });

  it("fetches and caches song on cache miss", async () => {
    const entry = makeEntry();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockSong), { status: 200 }),
    );

    const result = await resolveSong(cache, entry);
    expect(result).toEqual(mockSong);
    expect(cache.has("test123")).toBe(true);
  });

  it("returns null on fetch failure", async () => {
    const entry = makeEntry();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const result = await resolveSong(cache, entry);
    expect(result).toBeNull();
  });

  it("returns null on non-JSON response", async () => {
    const entry = makeEntry();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>Error</html>", { status: 200 }),
    );

    const result = await resolveSong(cache, entry);
    expect(result).toBeNull();
  });

  it("generates cache key from title+artist when no jiosaavnId", async () => {
    const entry = makeEntry({ jiosaavnId: undefined });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockSong), { status: 200 }),
    );

    const result = await resolveSong(cache, entry);
    expect(result).toEqual(mockSong);
    expect(cache.has("test song-test artist")).toBe(true);
  });
});
