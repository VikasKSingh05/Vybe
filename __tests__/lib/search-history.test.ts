import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadSearchHistory,
  saveSearchQuery,
  clearSearchHistory,
} from "@/lib/search-history";

describe("search-history", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty list when nothing is stored", () => {
    expect(loadSearchHistory()).toEqual([]);
  });

  it("round-trips a saved query", () => {
    saveSearchQuery("arijit singh");
    expect(loadSearchHistory()).toEqual(["arijit singh"]);
  });

  it("orders newest first and dedupes case-insensitively", () => {
    saveSearchQuery("lofi beats");
    saveSearchQuery("weeknd");
    saveSearchQuery("LOFI Beats");
    expect(loadSearchHistory()).toEqual(["LOFI Beats", "weeknd"]);
  });

  it("caps the list at 8 entries", () => {
    for (const q of ["a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8", "i9", "j10"]) {
      saveSearchQuery(q);
    }
    const history = loadSearchHistory();
    expect(history).toHaveLength(8);
    expect(history[0]).toBe("j10");
    expect(history).not.toContain("a1");
  });

  it("ignores empty and whitespace-only queries", () => {
    expect(saveSearchQuery("   ")).toEqual([]);
    expect(loadSearchHistory()).toEqual([]);
  });

  it("truncates overly long queries to 120 chars", () => {
    const long = "x".repeat(300);
    saveSearchQuery(long);
    expect(loadSearchHistory()).toEqual(["x".repeat(120)]);
  });

  it("survives corrupted payloads", () => {
    window.localStorage.setItem("vybe.search.v1", "{broken json");
    expect(loadSearchHistory()).toEqual([]);

    window.localStorage.setItem("vybe.search.v1", JSON.stringify({ nope: true }));
    expect(loadSearchHistory()).toEqual([]);

    window.localStorage.setItem(
      "vybe.search.v1",
      JSON.stringify(["ok", 42, null, "  ", "fine"]),
    );
    expect(loadSearchHistory()).toEqual(["ok", "fine"]);
  });

  it("clears completely", () => {
    saveSearchQuery("something");
    clearSearchHistory();
    expect(loadSearchHistory()).toEqual([]);
  });
});
