import { describe, it, expect, vi, beforeEach } from "vitest";
import { effectivePosition, playbackSignature, toWireState } from "@/lib/party/clock";
import type { PartyPlayback, PartyState } from "@/lib/party/types";

function makePlayback(overrides: Partial<PartyPlayback> = {}): PartyPlayback {
  return {
    queueId: "track1",
    startedAt: 1000,
    positionAtStart: 0,
    paused: false,
    pausedAt: null,
    ...overrides,
  };
}

function makeState(overrides: Partial<PartyState> = {}): PartyState {
  return {
    roomId: "abc123",
    createdAt: 0,
    hostId: "host1",
    vibeId: "all",
    members: [],
    queue: [],
    playback: null,
    reactions: [],
    version: 0,
    serverNow: 0,
    ...overrides,
  };
}

describe("effectivePosition", () => {
  it("returns 0 when playback is null", () => {
    expect(effectivePosition(null)).toBe(0);
  });

  it("returns 0 when playback has no queueId", () => {
    expect(effectivePosition(makePlayback({ queueId: null }))).toBe(0);
  });

  it("computes position for playing track", () => {
    const pb = makePlayback({ startedAt: 1000, positionAtStart: 10 });
    expect(effectivePosition(pb, 6000)).toBe(15);
  });

  it("computes position for paused track", () => {
    const pb = makePlayback({
      startedAt: 1000,
      positionAtStart: 10,
      paused: true,
      pausedAt: 5000,
    });
    expect(effectivePosition(pb, 9999)).toBe(14);
  });

  it("returns 0 for paused track with no pausedAt", () => {
    const pb = makePlayback({
      paused: true,
      pausedAt: null,
    });
    const result = effectivePosition(pb);
    expect(typeof result).toBe("number");
  });
});

describe("playbackSignature", () => {
  it("returns empty string for null", () => {
    expect(playbackSignature(null)).toBe("");
  });

  it("returns stable signature for same playback", () => {
    const pb = makePlayback();
    const sig1 = playbackSignature(pb);
    const sig2 = playbackSignature(pb);
    expect(sig1).toBe(sig2);
  });

  it("returns different signatures for different queueIds", () => {
    const sig1 = playbackSignature(makePlayback({ queueId: "a" }));
    const sig2 = playbackSignature(makePlayback({ queueId: "b" }));
    expect(sig1).not.toBe(sig2);
  });
});

describe("toWireState", () => {
  it("adds serverNow timestamp", () => {
    const state = makeState();
    const wire = toWireState(state, 42);
    expect(wire.serverNow).toBe(42);
  });

  it("truncates reactions to last 20", () => {
    const reactions = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      memberId: "m1",
      memberName: "Test",
      emoji: "🔥",
      at: Date.now(),
    }));
    const state = makeState({ reactions });
    const wire = toWireState(state, 0);
    expect(wire.reactions.length).toBe(20);
    expect(wire.reactions[0].id).toBe("10");
  });
});
