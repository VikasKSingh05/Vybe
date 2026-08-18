import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRoom, joinRoom, getRoom, dispatch } from "@/lib/party/store";
import { PARTY_MAX_MEMBERS } from "@/lib/party/types";

describe("createRoom", () => {
  it("creates a room with a host member", () => {
    const result = createRoom("Test Host", "all");
    expect(result.roomId).toBeTruthy();
    expect(result.member.isHost).toBe(true);
    expect(result.member.name).toBe("Test Host");
    expect(result.state.hostId).toBe(result.member.id);
    expect(result.state.vibeId).toBe("all");
    expect(result.state.members).toHaveLength(1);
  });

  it("truncates long host names", () => {
    const result = createRoom("A".repeat(50), "phonk");
    expect(result.member.name.length).toBeLessThanOrEqual(24);
  });

  it("falls back to 'Host' for empty name", () => {
    const result = createRoom("", "lofi");
    expect(result.member.name).toBe("Host");
  });
});

describe("joinRoom", () => {
  let roomId: string;

  beforeEach(() => {
    roomId = createRoom("Host", "all").roomId;
  });

  it("allows joining an existing room", () => {
    const result = joinRoom(roomId, "Guest");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.member.name).toBe("Guest");
      expect(result.member.isHost).toBe(false);
    }
  });

  it("returns 404 for non-existent room", () => {
    const result = joinRoom("nonexistent", "Guest");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });

  it("rejects when room is full", () => {
    for (let i = 0; i < PARTY_MAX_MEMBERS - 1; i++) {
      joinRoom(roomId, `Member ${i}`);
    }
    const result = joinRoom(roomId, "Extra");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
    }
  });

  it("falls back to 'Guest' for empty name", () => {
    const result = joinRoom(roomId, "");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.member.name).toBe("Guest");
    }
  });
});

describe("getRoom", () => {
  it("returns serialized state for existing room", () => {
    const { roomId } = createRoom("Host", "all");
    const state = getRoom(roomId);
    expect(state).not.toBeNull();
    expect(state!.roomId).toBe(roomId);
    expect(state!.serverNow).toBeGreaterThan(0);
  });

  it("returns null for non-existent room", () => {
    expect(getRoom("nonexistent")).toBeNull();
  });
});

describe("dispatch", () => {
  let roomId: string;
  let memberId: string;

  beforeEach(() => {
    const room = createRoom("Host", "all");
    roomId = room.roomId;
    memberId = room.member.id;
  });

  it("rejects unknown commands", () => {
    const result = dispatch(roomId, memberId, "unknown", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });

  it("handles heartbeat", () => {
    const result = dispatch(roomId, memberId, "heartbeat", {});
    expect(result.ok).toBe(true);
  });

  it("handles play/pause/next/prev for host", () => {
    expect(dispatch(roomId, memberId, "play", {}).ok).toBe(true);
    expect(dispatch(roomId, memberId, "pause", {}).ok).toBe(true);
    expect(dispatch(roomId, memberId, "next", {}).ok).toBe(true);
    expect(dispatch(roomId, memberId, "prev", {}).ok).toBe(true);
  });

  it("rejects host-only commands from non-host", () => {
    const { member } = joinRoom(roomId, "Guest") as { member: { id: string } };
    const result = dispatch(roomId, member.id, "play", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("adds a valid track to queue", () => {
    const song = {
      id: "s1",
      title: "Test",
      artist: "Artist",
      streamUrl: "https://example.com/stream",
    };
    const result = dispatch(roomId, memberId, "addTrack", { song });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.queue).toHaveLength(1);
    }
  });

  it("rejects invalid song payload", () => {
    const result = dispatch(roomId, memberId, "addTrack", { song: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });

  it("handles reaction with valid emoji", () => {
    const result = dispatch(roomId, memberId, "reaction", { emoji: "🔥" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.reactions).toHaveLength(1);
    }
  });

  it("rejects invalid emoji", () => {
    const result = dispatch(roomId, memberId, "reaction", { emoji: "💀" });
    expect(result.ok).toBe(false);
  });

  it("handles leave and promotes next host", () => {
    const guest = joinRoom(roomId, "Guest") as { member: { id: string } };
    const result = dispatch(roomId, guest.member.id, "leave", {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.members).toHaveLength(1);
      expect(result.state.hostId).toBe(memberId);
    }
  });

  it("returns 404 for non-existent room", () => {
    const result = dispatch("nonexistent", memberId, "heartbeat", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });
});
