import { describe, it, expect } from "vitest";
import { diffNewReactions } from "@/lib/party/reaction-diff";
import type { PartyReaction } from "@/lib/party/types";

function reaction(id: string): PartyReaction {
  return { id, memberId: "m1", memberName: "Asha", emoji: "🔥", at: 0 };
}

describe("diffNewReactions", () => {
  it("returns everything when nothing is known yet", () => {
    const known = new Set<string>();
    expect(diffNewReactions([reaction("a"), reaction("b")], known)).toHaveLength(2);
  });

  it("returns nothing when the list is unchanged", () => {
    const known = new Set<string>();
    diffNewReactions([reaction("a")], known);
    expect(diffNewReactions([reaction("a")], known)).toHaveLength(0);
  });

  it("returns only the new reactions on subsequent calls", () => {
    const known = new Set<string>();
    diffNewReactions([reaction("a")], known);
    expect(diffNewReactions([reaction("a"), reaction("b")], known)).toEqual([
      reaction("b"),
    ]);
  });

  it("prunes expired ids so bursts do not replay after TTL rotation", () => {
    const known = new Set<string>();
    diffNewReactions([reaction("a")], known);
    diffNewReactions([reaction("b")], known);
    // "a" expired server-side; if it ever reappeared it would be new again
    expect(known.has("a")).toBe(false);
    expect(known.has("b")).toBe(true);
  });
});
