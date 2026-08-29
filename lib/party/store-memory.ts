/**
 * In-memory PartyStore — the default when REDIS_URL is not set.
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
  PARTY_ROOM_TTL_MS,
} from "./types";
import type { DispatchResult, Envelope, PartyStore } from "./store-interface";
import { toWireState } from "./clock";
import { dispatchCommand, generateId, sanitizeName, type ApplyFn } from "./dispatch-commands";

export type { DispatchResult, Envelope, PartyStore };

const rooms = new Map<string, PartyState>();
const subscribers = new Map<string, Set<{ memberId: string | null; enqueue: (msg: Envelope) => void }>>();

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

function apply(roomId: string, mutator: (s: PartyState) => void): PartyState | null {
  const state = rooms.get(roomId);
  if (!state) return null;

  const prevMembers = state.members.slice();
  const prevQueue = state.queue.slice();
  const prevPlayback = state.playback;
  const prevReactions = state.reactions.slice();
  const prevHostId = state.hostId;
  const prevVibeId = state.vibeId;
  const prevLocked = state.locked;

  mutator(state);
  state.version += 1;

  const wire = toWireState(state);
  const set = subscribers.get(roomId);
  if (set) {
    const now = Date.now();
    const patch: PartyPatch = { version: wire.version, serverNow: now };
    let hasDiff = false;

    if (prevHostId !== wire.hostId) { patch.hostId = wire.hostId; hasDiff = true; }
    if (prevVibeId !== wire.vibeId) { patch.vibeId = wire.vibeId; hasDiff = true; }
    if (JSON.stringify(prevMembers) !== JSON.stringify(wire.members)) { patch.members = wire.members; hasDiff = true; }
    if (JSON.stringify(prevQueue) !== JSON.stringify(wire.queue)) { patch.queue = wire.queue; hasDiff = true; }
    if (prevPlayback !== state.playback) { patch.playback = wire.playback; hasDiff = true; }
    if (JSON.stringify(prevReactions) !== JSON.stringify(wire.reactions)) { patch.reactions = wire.reactions; hasDiff = true; }
    if (prevLocked !== wire.locked) { patch.locked = wire.locked; hasDiff = true; }

    if (!hasDiff) return wire;

    const envelope: Envelope = { event: "patch", data: patch };
    for (const sub of set) sub.enqueue(envelope);
  }
  return wire;
}

export const memoryStore: PartyStore = {
  createRoom(hostName: string, vibeId: VibeId) {
    const roomId = generateId(6);
    const member: PartyMember = {
      id: generateId(10),
      name: sanitizeName(hostName, "Host"),
      isHost: true,
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

  joinRoom(roomId: string, name: string) {
    const state = rooms.get(roomId);
    if (!state) return { ok: false, status: 404, error: "Room not found" };
    if (state.locked) return { ok: false, status: 403, error: "Room is locked" };
    if (state.members.length >= PARTY_MAX_MEMBERS) {
      return { ok: false, status: 429, error: "Room is full" };
    }
    const member: PartyMember = {
      id: generateId(10),
      name: sanitizeName(name, "Guest"),
      isHost: state.members.length === 0,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };
    const wire = apply(roomId, (s) => {
      s.members.push(member);
      if (s.members.length === 1) {
        s.hostId = member.id;
      }
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
        const changed = alive.length !== state.members.length || state.hostId !== alive[0]?.id;

        if (alive.length > 0) {
          alive[0].isHost = true;
          alive[0].lastSeen = Math.max(alive[0].lastSeen, now);
          state.hostId = alive[0].id;
        }

        const beforeLen = state.reactions.length;
        state.reactions = state.reactions.filter((r) => now - r.at < PARTY_REACTION_TTL_MS);
        const reactionsChanged = beforeLen !== state.reactions.length;

        state.members = alive;

        if (state.members.length === 0 && now - state.createdAt > PARTY_ROOM_TTL_MS) {
          rooms.delete(roomId);
          subscribers.delete(roomId);
          continue;
        }

        if (changed || reactionsChanged) {
          state.version += 1;
        }

        const wire = toWireState(state, now);
        const set = subscribers.get(roomId);
        if (set && set.size > 0) {
          for (const sub of set) sub.enqueue({ event: "state", data: wire });
        }
      } catch {
        // Skip corrupted room to avoid blocking cleanup of other rooms
      }
    }
  },
};
