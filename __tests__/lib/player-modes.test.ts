import { describe, it, expect, vi } from "vitest";
import type { PlaylistEntry } from "@/data/playlists";
import {
  advanceOnEnded,
  nextIndex,
  prevIndex,
  shuffleList,
  isRepeatMode,
} from "@/lib/player-modes";

function entry(id: string): PlaylistEntry {
  return { jiosaavnId: id, title: `Song ${id}`, artist: "Artist" };
}

describe("nextIndex", () => {
  const list = [entry("a"), entry("b"), entry("c")];

  it.each([
    [0, "all", 1],
    [1, "all", 2],
    [2, "all", 0],
    [0, "one", 1],
    [2, "one", 0],
  ])("wraps for %p with mode %s -> %p", (current, mode, expected) => {
    expect(nextIndex(current, list.length, mode as never)).toBe(expected);
  });

  it("returns null at the last track when repeat is off", () => {
    expect(nextIndex(2, list.length, "off")).toBeNull();
    expect(nextIndex(0, list.length, "off")).toBe(1);
  });

  it("returns null for an empty list", () => {
    expect(nextIndex(0, 0, "all")).toBeNull();
  });
});

describe("prevIndex", () => {
  const list = [entry("a"), entry("b"), entry("c")];

  it.each([
    [1, "all", 0],
    [0, "all", 2],
  ])("computes %p with mode all -> %p", (current, mode, expected) => {
    expect(prevIndex(current, list.length, mode as never)).toBe(expected);
  });

  it("returns null at the first track when repeat is off", () => {
    expect(prevIndex(0, list.length, "off")).toBeNull();
    expect(prevIndex(2, list.length, "off")).toBe(1);
  });
});

describe("advanceOnEnded", () => {
  const list = [entry("a"), entry("b"), entry("c")];

  it("replays the same index on repeat-one", () => {
    expect(advanceOnEnded(1, list.length, "one")).toBe(1);
  });

  it("wraps forward on repeat-all", () => {
    expect(advanceOnEnded(2, list.length, "all")).toBe(0);
  });

  it("stops at the end on repeat-off", () => {
    expect(advanceOnEnded(2, list.length, "off")).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(advanceOnEnded(0, 0, "all")).toBeNull();
  });
});

describe("isRepeatMode", () => {
  it("accepts the three valid modes", () => {
    expect(isRepeatMode("off")).toBe(true);
    expect(isRepeatMode("one")).toBe(true);
    expect(isRepeatMode("all")).toBe(true);
  });

  it("rejects nonsense", () => {
    expect(isRepeatMode("sometimes")).toBe(false);
    expect(isRepeatMode(undefined)).toBe(false);
    expect(isRepeatMode(null)).toBe(false);
  });
});

describe("shuffleList", () => {
  const list = [entry("a"), entry("b"), entry("c"), entry("d")];

  it("returns null for lists too small to shuffle", () => {
    expect(shuffleList([entry("a")], 0)).toBeNull();
    expect(shuffleList([], 0)).toBeNull();
  });

  it("returns a permutation containing all entries", () => {
    // Seed a deterministic RNG for reproducibility.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = shuffleList(list, 0);
    vi.restoreAllMocks();
    expect(result).toHaveLength(list.length);
    for (const item of list) expect(result).toContain(item);
  });

  it("keeps the current song anchored at its index", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = shuffleList(list, 2);
    vi.restoreAllMocks();
    expect(result).not.toBeNull();
    expect(result![2]).toBe(list[2]);
  });
});
