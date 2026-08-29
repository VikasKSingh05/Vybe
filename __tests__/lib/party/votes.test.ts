import { describe, it, expect } from "vitest";
import type { PartyTrack } from "@/lib/party/types";
import { sortQueueByVotes, voteCount, hasVoted } from "@/lib/party/votes";

function makeTrack(
  id: string,
  votes: { memberId: string; votedAt: number }[],
): PartyTrack {
  return {
    queueId: `q-${id}`,
    song: {
      id,
      title: id,
      artist: "Artist",
      streamUrl: "https://example.com/stream",
      provider: "jiosaavn",
    },
    addedBy: "x",
    addedByName: "X",
    votes: votes.map((v) => ({ ...v, memberName: v.memberId })),
    played: false,
  };
}

describe("voteCount", () => {
  it("counts votes", () => {
    expect(voteCount(makeTrack("a", [{ memberId: "1", votedAt: 1 }]))).toBe(1);
    expect(voteCount(makeTrack("a", []))).toBe(0);
  });
});

describe("hasVoted", () => {
  it("detects a member's vote", () => {
    const t = makeTrack("a", [
      { memberId: "1", votedAt: 1 },
      { memberId: "2", votedAt: 2 },
    ]);
    expect(hasVoted(t, "1")).toBe(true);
    expect(hasVoted(t, "3")).toBe(false);
  });
});

describe("sortQueueByVotes", () => {
  it("sorts highest vote count first", () => {
    const low = makeTrack("low", [{ memberId: "a", votedAt: 10 }]);
    const high = makeTrack("high", [
      { memberId: "a", votedAt: 10 },
      { memberId: "b", votedAt: 20 },
    ]);
    const sorted = sortQueueByVotes([low, high]);
    expect(sorted[0].song.id).toBe("high");
    expect(sorted[1].song.id).toBe("low");
  });

  it("breaks equal-count ties by earliest vote (FIFO)", () => {
    // Both have 2 votes. FirstOne was voted earlier overall.
    const first = makeTrack("first", [
      { memberId: "a", votedAt: 1 },
      { memberId: "b", votedAt: 100 },
    ]);
    const second = makeTrack("second", [
      { memberId: "c", votedAt: 50 },
      { memberId: "d", votedAt: 60 },
    ]);
    const sorted = sortQueueByVotes([second, first]);
    expect(sorted[0].song.id).toBe("first");
    expect(sorted[1].song.id).toBe("second");
  });

  it("keeps stable order for zero-vote ties", () => {
    const a = makeTrack("a", []);
    const b = makeTrack("b", []);
    const sorted = sortQueueByVotes([b, a]);
    expect(sorted.map((t) => t.song.id)).toEqual(["b", "a"]);
  });
});
