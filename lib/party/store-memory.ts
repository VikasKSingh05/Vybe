/**
 * In-memory PartyStore — the default when REDIS_URL is not set.
 *
 * Mutations are serialized by the Node event loop, which gives the same
 * atomicity that the Redis store achieves with WATCH/MULTI/EXEC.
 */
import type { VibeId } from "@/data/types";
import type {
  PartyMember,
  PartyPatch,
  PartyState,
} from "./types";
import {
  PARTY_MAX_MEMBERS,
  PARTY_MEMBER_IDLE_MS,
  PARTY_REACTION_TTL_MS,
} from "./types";
import type { DispatchResult, Envelope, PartyStore } from "./store-interface";
import { toWireState } from "./clock";
import { dispatchCommand, generateId, sanitizeName, type ApplyFn } from "./dispatch-commands";
import { ensureValidHost } from "./host";

export type { DispatchResult, Envelope, PartyStore };

const rooms = new Map<string, PartyState>();
const subscribers = new Map<string, Set<{ memberId: string | null; enqueue: (msg: Envelope) => void }>>();

const VALID_MEMBER_ID = /^[a-zA-Z0-9_-]{6,64}$/;

type Snapshot = {
  hostId: string;
  vibeId: VibeId;
  members: PartyMember[];
  queue: PartyState["queue"];
  playback: PartyState["playback"];
  reactions: PartyState["reactions"];
  locked: boolean;
};

function snapshot(state: PartyState): Snapshot {
  // Commands mutate members/queue entries in place (host, votes, played), so
  // a shallow copy would diff to "no change" and silently drop the patch.
  return structuredClone({
    hostId: state.hostId,
    vibeId: state.vibeId,
    members: state.members,
    queue: state.queue,
    playback: state.playback,
    reactions: state.reactions.slice(-20),
    locked: state.locked,
  });
}

function getMember(state: PartyState, memberId: string): PartyMember | null {
  const member = state.members.find((m) => m.id === memberId) ?? null;
  if (member) member.lastSeen = Date.now();
  return member;
}

function touchMember(state: PartyState, memberId: string): void {
  const member = state.members.find((m) => m.id === memberId);
  if (member) member.lastSeen = Date.now();
}

function serialize(roomId: string): PartyState | null {
  const state = rooms.get(roomId);
  return state ? toWireState(state) : null;
}

function broadcast(roomId: string, msg: Envelope): void {
  subscribers.get(roomId)?.forEach((sub) => sub.enqueue(msg));
}

function apply(roomId: string, mutator: (s: PartyState) => void): PartyState | null {
  const state = rooms.get(roomId);
  if (!state) return null;

  const prev = snapshot(state);
  mutator(state);

  const wire = toWireState(state);
  const patch: PartyPatch = { version: wire.version + 1, serverNow: Date.now() };
  let hasDiff = prev.hostId !== wire.hostId || prev.vibeId !== wire.vibeId || prev.locked !== wire.locked;
  if (!hasDiff) {
    hasDiff = (["members", "queue", "playback", "reactions"] as const).some(
      (key) => JSON.stringify(prev[key]) !== JSON.stringify(wire[key]),
    );
  }

  if (state.members.length === 0) {
    state.version += 1;
    patch.version = state.version;
    broadcast(roomId, { event: "closed" });
    rooms.delete(roomId);
    subscribers.delete(roomId);
    return toWireState(state);
  }

  if (!hasDiff) return toWireState(state);

  state.version += 1;
  patch.version = state.version;
  patch.hostId = state.hostId;
  patch.vibeId = state.vibeId;
  patch.locked = state.locked;
  patch.members = state.members;
  patch.queue = state.queue;
  patch.playback = state.playback;
  patch.reactions = state.reactions;
  broadcast(roomId, { event: "patch", data: patch });
  return toWireState(state);
}

export const memoryStore: PartyStore = {
  createRoom(hostName: string, vibeId: VibeId) {
    const roomId = generateId(6);
    const member: PartyMember = {
      id: generateId(10),
      name: sanitizeName(hostName, "Host"),
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };
    const state: PartyState = {
      roomId,
      createdAt: Date.now(),
      hostId: member.id,
      vibeId,
      members: [member],
      queue: [],
      playback: null,
      reactions: [],
      locked: false,
      version: 0,
      serverNow: Date.now(),
    };
    rooms.set(roomId, state);
    subscribers.set(roomId, new Set());
    return { roomId, member, state: toWireState(state) };
  },

  joinRoom(roomId: string, name: string, memberId?: string) {
    const state = rooms.get(roomId);
    if (!state) return { ok: false, status: 404, error: "Room not found" };
    if (state.locked) return { ok: false, status: 403, error: "Room is locked" };

    // Rejoining with the stored identity must not mint a second member: doing
    // so left the old (phantom) host in the room and stripped the real user
    // of host controls for up to ten minutes.
    const existing = memberId ? state.members.find((m) => m.id === memberId) : null;
    if (existing) {
      existing.name = sanitizeName(name, existing.name);
      existing.lastSeen = Date.now();
      return { ok: true, member: existing, state: toWireState(state) };
    }

    if (state.members.length >= PARTY_MAX_MEMBERS) {
      return { ok: false, status: 429, error: "Room is full" };
    }

    const member: PartyMember = {
      id: memberId && VALID_MEMBER_ID.test(memberId) ? memberId : generateId(10),
      name: sanitizeName(name, "Guest"),
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };
    const wire = apply(roomId, (s) => {
      s.members.push(member);
      ensureValidHost(s);
    });
    if (!wire) return { ok: false, status: 404, error: "Room not found" };
    return { ok: true, member, state: wire };
  },

  getRoom(roomId: string) {
    return serialize(roomId);
  },

  subscribe(roomId, memberId, enqueue) {
    const state = rooms.get(roomId);
    if (!state) return () => {};
    if (memberId) touchMember(state, memberId);

    let set = subscribers.get(roomId);
    if (!set) {
      set = new Set();
      subscribers.set(roomId, set);
    }
    const sub = { memberId, enqueue };
    set.add(sub);

    return () => {
      const current = subscribers.get(roomId);
      if (current) {
        current.delete(sub);
        if (current.size === 0) subscribers.delete(roomId);
      }
    };
  },

  dispatch(roomId, memberId, command, payload) {
    const state = rooms.get(roomId);
    if (!state) return { ok: false, status: 404, error: "Room not found" };
    const member = getMember(state, memberId);
    if (!member) return { ok: false, status: 403, error: "Not a member of this room" };

    if (command === "heartbeat") {
      return { ok: true, state: toWireState(state) };
    }

    const syncApply: ApplyFn = (mutator) => apply(roomId, mutator);
    return dispatchCommand(state, member, command, payload, syncApply);
  },

  startMaintenance() {
    const now = Date.now();
    for (const [roomId, state] of rooms) {
      try {
        const alive = state.members.filter((m) => now - m.lastSeen < PARTY_MEMBER_IDLE_MS);
        const membersChanged = alive.length !== state.members.length;

        state.members = alive;
        // Preserve the current host while present; promote the earliest-joined
        // survivor only when the host is actually gone. Never revert a transfer.
        const hostChanged = ensureValidHost(state);

        const beforeLen = state.reactions.length;
        state.reactions = state.reactions.filter((r) => now - r.at < PARTY_REACTION_TTL_MS);
        const reactionsChanged = beforeLen !== state.reactions.length;

        if (state.members.length === 0) {
          // An empty room must not survive with a stale queue/playback for the
          // next joiner. No TTL grace period — end it the moment it is empty.
          broadcast(roomId, { event: "closed" });
          rooms.delete(roomId);
          subscribers.delete(roomId);
          continue;
        }

        if (membersChanged || hostChanged || reactionsChanged) {
          state.version += 1;
        }

        // Full state replay keeps presence honest between sparse user patches.
        broadcast(roomId, { event: "state", data: toWireState(state, now) });
      } catch {
        // Skip corrupted room to avoid blocking cleanup of other rooms
      }
    }
  },
};
