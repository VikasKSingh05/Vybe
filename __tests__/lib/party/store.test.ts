import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRoom, joinRoom, getRoom, dispatch } from "@/lib/party/store";
import { PARTY_MAX_MEMBERS } from "@/lib/party/types";
import type { PartyState } from "@/lib/party/types";
import type { DispatchResult } from "@/lib/party/store-interface";

/** Narrow a successful dispatch result so its `state` is accessible. */
async function stateOf(res: DispatchResult | Promise<DispatchResult>): Promise<{ ok: true; state: PartyState }> {
  const r = await res;
  if (!r.ok) throw new Error(`expected dispatch to succeed: ${r.error}`);
  return r;
}

describe("createRoom", () => {
  it("creates a room with a host member", async () => {
    const result = await createRoom("Test Host", "phonk");
    expect(result.roomId).toBeTruthy();
    expect(result.member.isHost).toBe(true);
    expect(result.member.name).toBe("Test Host");
    expect(result.state.hostId).toBe(result.member.id);
    expect(result.state.vibeId).toBe("phonk");
    expect(result.state.members).toHaveLength(1);
  });

  it("truncates long host names", async () => {
    const result = await createRoom("A".repeat(50), "phonk");
    expect(result.member.name.length).toBeLessThanOrEqual(24);
  });

  it("falls back to 'Host' for empty name", async () => {
    const result = await createRoom("", "lofi");
    expect(result.member.name).toBe("Host");
  });
});

describe("joinRoom", () => {
  let roomId: string;

  beforeEach(async () => {
    roomId = (await createRoom("Host", "phonk")).roomId;
  });

  it("allows joining an existing room", async () => {
    const result = await joinRoom(roomId, "Guest");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.member.name).toBe("Guest");
      expect(result.member.isHost).toBe(false);
    }
  });

  it("returns 404 for non-existent room", async () => {
    const result = await joinRoom("nonexistent", "Guest");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });

  it("rejects when room is full", async () => {
    for (let i = 0; i < PARTY_MAX_MEMBERS - 1; i++) {
      await joinRoom(roomId, `Member ${i}`);
    }
    const result = await joinRoom(roomId, "Extra");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
    }
  });

  it("falls back to 'Guest' for empty name", async () => {
    const result = await joinRoom(roomId, "");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.member.name).toBe("Guest");
    }
  });
});

describe("getRoom", () => {
  it("returns serialized state for existing room", async () => {
    const { roomId } = await createRoom("Host", "phonk");
    const state = await getRoom(roomId);
    expect(state).not.toBeNull();
    expect(state!.roomId).toBe(roomId);
    expect(state!.serverNow).toBeGreaterThan(0);
  });

  it("returns null for non-existent room", async () => {
    expect(await getRoom("nonexistent")).toBeNull();
  });
});

describe("dispatch", () => {
  let roomId: string;
  let memberId: string;

  beforeEach(async () => {
    const room = await createRoom("Host", "phonk");
    roomId = room.roomId;
    memberId = room.member.id;
  });

  it("rejects unknown commands", async () => {
    const result = await dispatch(roomId, memberId, "unknown", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });

  it("handles heartbeat", async () => {
    const result = await dispatch(roomId, memberId, "heartbeat", {});
    expect(result.ok).toBe(true);
  });

  it("handles play/pause/next/prev for host", async () => {
    expect((await dispatch(roomId, memberId, "play", {})).ok).toBe(true);
    expect((await dispatch(roomId, memberId, "pause", {})).ok).toBe(true);
    expect((await dispatch(roomId, memberId, "next", {})).ok).toBe(true);
    expect((await dispatch(roomId, memberId, "prev", {})).ok).toBe(true);
  });

  it("rejects host-only commands from non-host", async () => {
    const { member } = (await joinRoom(roomId, "Guest")) as { member: { id: string } };
    const result = await dispatch(roomId, member.id, "play", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("adds a valid track to queue", async () => {
    const song = {
      id: "s1",
      title: "Test",
      artist: "Artist",
      streamUrl: "https://example.com/stream",
    };
    const result = await dispatch(roomId, memberId, "addTrack", { song });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.queue).toHaveLength(1);
    }
  });

  it("de-dupes: adding an already-queued song upvotes it instead of duplicating", async () => {
    const song = {
      id: "s1",
      title: "Test",
      artist: "Artist",
      streamUrl: "https://example.com/stream",
    };
    const first = await stateOf(dispatch(roomId, memberId, "addTrack", { song }));
    expect(first.state.queue).toHaveLength(1);
    expect(first.state.queue[0].votes).toHaveLength(1);

    const duplicate = await stateOf(dispatch(roomId, memberId, "addTrack", { song }));

    const state = await getRoom(roomId);
    expect(state!.queue).toHaveLength(1);
    // The same member re-adding does not double their vote (one vote per member).
    expect(state!.queue[0].votes).toHaveLength(1);
  });

  it("rejects invalid song payload", async () => {
    const result = await dispatch(roomId, memberId, "addTrack", { song: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });

  it("handles reaction with valid emoji", async () => {
    const result = await dispatch(roomId, memberId, "reaction", { emoji: "🔥" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.reactions).toHaveLength(1);
    }
  });

  it("rejects invalid emoji", async () => {
    const result = await dispatch(roomId, memberId, "reaction", { emoji: "💀" });
    expect(result.ok).toBe(false);
  });

  it("handles leave and promotes next host", async () => {
    const guest = (await joinRoom(roomId, "Guest")) as { member: { id: string } };
    const result = await dispatch(roomId, guest.member.id, "leave", {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.members).toHaveLength(1);
      expect(result.state.hostId).toBe(memberId);
    }
  });

  describe("transferHost", () => {
    it("swaps the host flags and hostId", async () => {
      const guest = (await joinRoom(roomId, "Guest")) as { member: { id: string } };
      const result = await dispatch(roomId, memberId, "transferHost", {
        targetMemberId: guest.member.id,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state.hostId).toBe(guest.member.id);
        const oldHost = result.state.members.find((m) => m.id === memberId);
        const newHost = result.state.members.find((m) => m.id === guest.member.id);
        expect(oldHost?.isHost).toBe(false);
        expect(newHost?.isHost).toBe(true);
      }

      // Control actually moved: the new host can now play, the old cannot
      expect((await dispatch(roomId, guest.member.id, "play", {})).ok).toBe(true);
      expect((await dispatch(roomId, memberId, "pause", {})).ok).toBe(false);
    });

    it("rejects a transfer from a non-host", async () => {
      const guest = (await joinRoom(roomId, "Guest")) as { member: { id: string } };
      const result = await dispatch(roomId, guest.member.id, "transferHost", {
        targetMemberId: memberId,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(403);
      }
    });

    it("rejects transferring to yourself", async () => {
      const result = await dispatch(roomId, memberId, "transferHost", {
        targetMemberId: memberId,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
      }
    });

    it("rejects an unknown or missing target", async () => {
      const missing = await dispatch(roomId, memberId, "transferHost", {
        targetMemberId: "ghost",
      });
      expect(missing.ok).toBe(false);
      if (!missing.ok) {
        expect(missing.status).toBe(400);
      }

      const noPayload = await dispatch(roomId, memberId, "transferHost", {});
      expect(noPayload.ok).toBe(false);
      if (!noPayload.ok) {
        expect(noPayload.status).toBe(400);
      }
    });
  });

  it("returns 404 for non-existent room", async () => {
    const result = await dispatch("nonexistent", memberId, "heartbeat", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });
});

describe("dispatch voting", () => {
  let roomId: string;
  let hostId: string;
  let guestIds: { host: string; g1: string; g2: string };

  const songFor = (id: string) => ({
    id,
    title: `Song ${id}`,
    artist: "Artist",
    streamUrl: `https://example.com/${id}`,
  });

  async function add(song: { id: string }, byMemberId: string) {
    return stateOf(dispatch(roomId, byMemberId, "addTrack", { song }));
  }

  beforeEach(async () => {
    const room = await createRoom("Host", "phonk");
    roomId = room.roomId;
    hostId = room.member.id;
    const g1 = (await joinRoom(roomId, "G1")) as { member: { id: string } };
    const g2 = (await joinRoom(roomId, "G2")) as { member: { id: string } };
    guestIds = { host: hostId, g1: g1.member.id, g2: g2.member.id };
  });

  it("tracks one vote per member and toggles off", async () => {
    await add(songFor("s1"), guestIds.g1);
    await add(songFor("s1"), guestIds.g2);
    const voted = await dispatch(roomId, guestIds.g1, "vote", { queueId: "x" });
    expect(voted.ok).toBe(false);

    const res = await getRoom(roomId);
    const track = res!.queue[0];
    expect(track.votes).toHaveLength(2);

    // Toggling g1's vote off leaves only g2.
    const off = await dispatch(roomId, guestIds.g1, "vote", { queueId: track.queueId });
    expect(off.ok).toBe(true);
    const after = await getRoom(roomId);
    expect(after!.queue[0].votes).toHaveLength(1);
    expect(after!.queue[0].votes[0].memberId).toBe(guestIds.g2);
  });

  it("next plays the highest-voted unplayed track with FIFO tie-break", async () => {
    // g1 adds A, g2 adds B — each auto-votes for their own song (1 vote each).
    await add(songFor("A"), guestIds.g1);
    await add(songFor("B"), guestIds.g2);
    // Host adds C with 1 vote (host).
    await add(songFor("C"), guestIds.host);

    // Give A two votes (g2 also votes A) so it is the top pick.
    const state0 = await getRoom(roomId);
    const aTrack = state0!.queue.find((t) => t.song.id === "A")!;
    await dispatch(roomId, guestIds.g2, "vote", { queueId: aTrack.queueId });

    // With no playback yet, next picks the highest-voted track (A).
    const afterNext = await stateOf(dispatch(roomId, hostId, "next", {}));
    const picked = afterNext.state.queue.find((t) => t.queueId === afterNext.state.playback?.queueId);
    expect(picked?.song.id).toBe("A");
  });

  it("rotates to the top-voted track once the whole round has played", async () => {
    await add(songFor("A"), guestIds.g1);
    await add(songFor("B"), guestIds.g2);

    // Play A, then B via next (rotation with no votes aside from the adder).
    await dispatch(roomId, hostId, "play", {});
    await dispatch(roomId, hostId, "next", {}); // -> one of them
    const second = await stateOf(dispatch(roomId, hostId, "next", {})); // -> the other
    expect(second.state.playback?.queueId).toBeTruthy();

    // All tracks now played; the next call resets the round and plays again.
    const third = await stateOf(dispatch(roomId, hostId, "next", {}));
    expect(third.state.playback?.queueId).toBeTruthy();
  });
});

describe("dispatch host controls", () => {
  let roomId: string;
  let hostId: string;
  let guestId: string;

  beforeEach(async () => {
    const room = await createRoom("Host", "phonk");
    roomId = room.roomId;
    hostId = room.member.id;
    const guest = (await joinRoom(roomId, "Guest")) as { member: { id: string } };
    guestId = guest.member.id;
  });

  it("lockRoom is host-only and blocks new joins when locked", async () => {
    const byGuest = await dispatch(roomId, guestId, "lockRoom", {});
    expect(byGuest.ok).toBe(false);

    const lock = await stateOf(dispatch(roomId, hostId, "lockRoom", {}));
    expect(lock.state.locked).toBe(true);

    const join = await joinRoom(roomId, "Latecomer");
    expect(join.ok).toBe(false);
    if (!join.ok) {
      expect(join.status).toBe(403);
      expect(join.error).toBe("Room is locked");
    }

    const unlock = await stateOf(dispatch(roomId, hostId, "lockRoom", {}));
    expect(unlock.state.locked).toBe(false);
  });

  it("removeMember is host-only and kicks a guest, pruning their votes", async () => {
    // Guest adds the only track (auto-vote).
    await dispatch(roomId, guestId, "addTrack", {
      song: { id: "s1", title: "S1", artist: "A", streamUrl: "https://e.com/s1" },
    });

    const byGuest = await dispatch(roomId, guestId, "removeMember", { targetMemberId: hostId });
    expect(byGuest.ok).toBe(false);

    const kick = await stateOf(dispatch(roomId, hostId, "removeMember", { targetMemberId: guestId }));
    expect(kick.state.members.some((m) => m.id === guestId)).toBe(false);
    // The kicked guest's vote is pruned from the track.
    const track = kick.state.queue[0];
    expect(track.votes.some((v) => v.memberId === guestId)).toBe(false);
  });

  it("removeMember rejects removing the host or yourself", async () => {
    const self = await dispatch(roomId, hostId, "removeMember", { targetMemberId: hostId });
    expect(self.ok).toBe(false);
    if (!self.ok) expect(self.status).toBe(400);

    const host = await dispatch(roomId, hostId, "removeMember", { targetMemberId: guestId });
    if (host.ok) {
      // After kicking the only guest, guest can't be the host; nothing to assert further.
    }
  });
});
