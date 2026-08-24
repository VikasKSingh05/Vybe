import { describe, it, expect } from "vitest";
import { applyReorder, insertAfterCurrent } from "@/lib/queue-order";
import type { PlaylistEntry } from "@/data/playlists";

function entry(id: string): PlaylistEntry {
  return { jiosaavnId: id, title: `Song ${id}`, artist: "Artist" };
}

function list(...ids: string[]): PlaylistEntry[] {
  return ids.map(entry);
}

describe("applyReorder", () => {
  it("moves an item down", () => {
    const result = applyReorder(list("a", "b", "c", "d"), 0, 2, 0);
    expect(result?.list.map((e) => e.jiosaavnId)).toEqual(["b", "c", "a", "d"]);
    expect(result?.currentIndex).toBe(2);
  });

  it("moves an item up", () => {
    const result = applyReorder(list("a", "b", "c"), 2, 0, 1);
    expect(result?.list.map((e) => e.jiosaavnId)).toEqual(["c", "a", "b"]);
    // playing index 1 ("b") shifts right by one after insert above it
    expect(result?.currentIndex).toBe(2);
  });

  it("anchors currentIndex when the playing item itself moves", () => {
    const result = applyReorder(list("a", "b", "c", "d"), 1, 3, 1);
    expect(result?.list.map((e) => e.jiosaavnId)).toEqual(["a", "c", "d", "b"]);
    expect(result?.currentIndex).toBe(3);
  });

  it("decrements currentIndex when an earlier item moves past the playing one", () => {
    const result = applyReorder(list("a", "b", "c", "d"), 0, 2, 2);
    expect(result?.list.map((e) => e.jiosaavnId)).toEqual(["b", "c", "a", "d"]);
    expect(result?.currentIndex).toBe(1);
  });

  it("increments currentIndex when a later item moves before the playing one", () => {
    const result = applyReorder(list("a", "b", "c", "d"), 3, 1, 1);
    expect(result?.list.map((e) => e.jiosaavnId)).toEqual(["a", "d", "b", "c"]);
    expect(result?.currentIndex).toBe(2);
  });

  it("returns null for same-index no-op", () => {
    expect(applyReorder(list("a", "b"), 1, 1, 0)).toBeNull();
  });

  it("returns null for out-of-bounds indices", () => {
    expect(applyReorder(list("a"), 0, 5, 0)).toBeNull();
    expect(applyReorder(list("a"), -1, 0, 0)).toBeNull();
    expect(applyReorder(list("a"), 0, -2, 0)).toBeNull();
  });

  it("does not mutate the input list", () => {
    const original = list("a", "b", "c");
    const snapshot = original.map((e) => e.jiosaavnId);
    applyReorder(original, 0, 2, 0);
    expect(original.map((e) => e.jiosaavnId)).toEqual(snapshot);
  });
});

describe("insertAfterCurrent", () => {
  it("inserts directly after the current track", () => {
    const result = insertAfterCurrent(list("a", "b", "c"), 0, entry("x"));
    expect(result.map((e) => e.jiosaavnId)).toEqual(["a", "x", "b", "c"]);
  });

  it("appends when current is the last track", () => {
    const result = insertAfterCurrent(list("a", "b"), 1, entry("x"));
    expect(result.map((e) => e.jiosaavnId)).toEqual(["a", "b", "x"]);
  });

  it("handles an empty queue", () => {
    const result = insertAfterCurrent([], 0, entry("x"));
    expect(result.map((e) => e.jiosaavnId)).toEqual(["x"]);
  });

  it("does not mutate the input list", () => {
    const original = list("a", "b");
    insertAfterCurrent(original, 0, entry("x"));
    expect(original.map((e) => e.jiosaavnId)).toEqual(["a", "b"]);
  });
});
