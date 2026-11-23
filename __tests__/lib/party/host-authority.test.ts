import { describe, it, expect } from "vitest";
import { createRoom, dispatch, getRoom, joinRoom, subscribe } from "@/lib/party/store";
import type { PartyState } from "@/lib/party/types";
import type { Envelope } from "@/lib/party/store-interface";

async function okState(result: ReturnType<typeof dispatch>): Promise<PartyState> {
  const resolved = await result;
  if (!resolved.ok) throw new Error(resolved.error);
  return resolved.state;
}

describe("party host authority", () => {
  it("keeps the transferred host when the old host leaves", async () => {
    const room = await createRoom("A", "chill");
    const guest = await joinRoom(room.roomId, "B");
    if (!guest.ok) throw new Error(guest.error);

    await okState(
      dispatch(room.roomId, room.member.id, "transferHost", {
        targetMemberId: guest.member.id,
      }),
    );
    const afterLeave = await okState(dispatch(room.roomId, room.member.id, "leave", {}));

    expect(afterLeave.hostId).toBe(guest.member.id);
    expect(afterLeave.members.some((m) => m.id === guest.member.id)).toBe(true);
    expect(afterLeave.members.some((m) => m.id === room.member.id)).toBe(false);
    // Authority follows hostId, so the remaining member really controls the room.
    expect((await dispatch(room.roomId, guest.member.id, "play", {})).ok).toBe(true);
  });

  it("promotes the earliest-joined survivor when the host leaves", async () => {
    const room = await createRoom("Host", "chill");
    const first = await joinRoom(room.roomId, "First");
    const second = await joinRoom(room.roomId, "Second");
    if (!first.ok || !second.ok) throw new Error("failed to join");

    const before = await getRoom(room.roomId);
    const survivors = (before?.members ?? [])
      .filter((m) => m.id !== room.member.id)
      .slice()
      .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));

    const after = await okState(dispatch(room.roomId, room.member.id, "leave", {}));
    expect(after.hostId).toBe(survivors[0]?.id);
    expect(after.members.filter((m) => m.id === after.hostId)).toHaveLength(1);
  });

  it("ends the room immediately when the last member leaves", async () => {
    const room = await createRoom("Solo", "chill");
    const events: Envelope[] = [];
    const unsub = subscribe(room.roomId, room.member.id, (msg) => events.push(msg));

    await okState(dispatch(room.roomId, room.member.id, "leave", {}));

    expect(events.some((e) => e.event === "closed")).toBe(true);
    expect(await getRoom(room.roomId)).toBeNull();
    unsub();
  });

  it("reattaches a reconnecting member instead of creating a phantom host", async () => {
    const room = await createRoom("Host", "chill");
    const guest = await joinRoom(room.roomId, "Guest");
    if (!guest.ok) throw new Error(guest.error);

    const rejoined = await joinRoom(room.roomId, "Guest Again", guest.member.id);
    expect(rejoined.ok).toBe(true);
    if (rejoined.ok) {
      expect(rejoined.member.id).toBe(guest.member.id);
      expect(rejoined.member.name).toBe("Guest Again");
      expect(rejoined.state.members).toHaveLength(2);
      expect(rejoined.state.hostId).toBe(room.member.id);
      expect(rejoined.state.members.filter((m) => m.id === guest.member.id)).toHaveLength(1);
    }
  });
});
