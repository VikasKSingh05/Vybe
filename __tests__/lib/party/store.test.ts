import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRoom, joinRoom, getRoom, dispatch } from "@/lib/party/store";
import { PARTY_MAX_MEMBERS } from "@/lib/party/types";

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

  it("rejects adding a track already in queue", async () => {
    const song = {
      id: "s1",
      title: "Test",
      artist: "Artist",
      streamUrl: "https://example.com/stream",
    };
    const first = await dispatch(roomId, memberId, "addTrack", { song });
    expect(first.ok).toBe(true);

    const duplicate = await dispatch(roomId, memberId, "addTrack", { song });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.status).toBe(409);
      expect(duplicate.error).toBe("This song is already in the queue");
    }

    const state = await getRoom(roomId);
    expect(state!.queue).toHaveLength(1);
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

  it("returns 404 for non-existent room", async () => {
    const result = await dispatch("nonexistent", memberId, "heartbeat", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });
});
