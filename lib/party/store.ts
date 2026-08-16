import type { Song } from "@/types/music";
import type { VibeId } from "@/data/types";
import type {
  PartyMember,
  PartyReaction,
  PartyState,
} from "./types";
import {
  PARTY_EMOJIS,
  PARTY_MAX_MEMBERS,
  PARTY_MAX_QUEUE,
  PARTY_MEMBER_IDLE_MS,
  PARTY_REACTION_TTL_MS,
  PARTY_ROOM_TTL_MS,
  PARTY_VIBES,
} from "./types";
import { toWireState } from "./clock";

export type DispatchResult =
  | { ok: true; state: PartyState }
  | { ok: false; status: number; error: string };

interface Subscriber {
  memberId: string | null;
  enqueue: (state: PartyState) => void;
}

const rooms = new Map<string, PartyState>();
const subscribers = new Map<string, Set<Subscriber>>();

const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function generateId(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) out += ID_ALPHABET[byte % ID_ALPHABET.length];
  return out;
}

function sanitizeName(name: string, fallback: string): string {
  const trimmed = name.trim().slice(0, 24);
  return trimmed || fallback;
}

function isVibe(v: string): v is VibeId {
  return (PARTY_VIBES as string[]).includes(v);
}

function isValidSong(song: unknown): song is Song {
  if (!song || typeof song !== "object") return false;
  const s = song as Song;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    typeof s.streamUrl === "string" &&
    s.streamUrl.length > 0
  );
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

function isHost(state: PartyState, memberId: string): boolean {
  return state.hostId === memberId;
}

function serialize(roomId: string): PartyState | null {
  const state = rooms.get(roomId);
  return state ? toWireState(state) : null;
}

function apply(roomId: string, mutator: (s: PartyState) => void): PartyState | null {
  const state = rooms.get(roomId);
  if (!state) return null;
  mutator(state);
  state.version += 1;
  const wire = toWireState(state);
  const set = subscribers.get(roomId);
  if (set) {
    for (const sub of set) sub.enqueue(wire);
  }
  return wire;
}

/** Playback helpers. */

function startPlayback(state: PartyState, queueIndex: number, position = 0, paused = false): void {
  const track = state.queue[queueIndex];
  const now = Date.now();
  if (!track) {
    state.playback = null;
    return;
  }
  state.playback = {
    queueId: track.queueId,
    startedAt: now,
    positionAtStart: position,
    paused,
    pausedAt: paused ? now : null,
  };
}

function currentQueueIndex(state: PartyState): number {
  if (!state.playback?.queueId) return -1;
  return state.queue.findIndex((t) => t.queueId === state.playback?.queueId);
}

/** Room lifecycle. */

export function createRoom(hostName: string, vibeId: VibeId): { roomId: string; member: PartyMember; state: PartyState } {
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
    version: 0,
    serverNow: Date.now(),
  };
  rooms.set(roomId, state);
  subscribers.set(roomId, new Set());
  return { roomId, member, state: toWireState(state) };
}

export type JoinResult =
  | { ok: true; member: PartyMember; state: PartyState }
  | { ok: false; status: number; error: string };

export function joinRoom(roomId: string, name: string): JoinResult {
  const state = rooms.get(roomId);
  if (!state) {
    return { ok: false, status: 404, error: "Room not found" };
  }
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
  });
  if (!wire) return { ok: false, status: 404, error: "Room not found" };
  return { ok: true, member, state: wire };
}

export function getRoom(roomId: string): PartyState | null {
  return serialize(roomId);
}

export function roomExists(roomId: string): boolean {
  return rooms.has(roomId);
}

/** SSE subscription. `memberId` ties a connection to a member for cleanup. */
export function subscribe(
  roomId: string,
  memberId: string | null,
  enqueue: (state: PartyState) => void,
): () => void {
  const state = rooms.get(roomId);
  if (!state) return () => {};
  if (memberId) touchMember(state, memberId);

  let set = subscribers.get(roomId);
  if (!set) {
    set = new Set();
    subscribers.set(roomId, set);
  }
  const sub: Subscriber = { memberId, enqueue };
  set.add(sub);

  return () => {
    const current = subscribers.get(roomId);
    if (current) {
      current.delete(sub);
      if (current.size === 0) subscribers.delete(roomId);
    }
  };
}

/** Commands. */

export function dispatch(
  roomId: string,
  memberId: string,
  command: string,
  payload: Record<string, unknown> | undefined,
): DispatchResult {
  const state = rooms.get(roomId);
  if (!state) return { ok: false, status: 404, error: "Room not found" };
  const member = getMember(state, memberId);
  if (!member) return { ok: false, status: 403, error: "Not a member of this room" };

  const requiresHost = () => {
    if (!isHost(state, memberId)) {
      return { ok: false, status: 403, error: "Only the host can do that" } as DispatchResult;
    }
    return null;
  };

  switch (command) {
    case "leave": {
      const wire = apply(roomId, (s) => {
        s.members = s.members.filter((m) => m.id !== memberId);
        s.reactions = s.reactions.filter((r) => r.memberId !== memberId);
        if (s.hostId === memberId) {
          const nextHost = s.members[0] ?? null;
          if (nextHost) {
            nextHost.isHost = true;
            s.hostId = nextHost.id;
          }
        }
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "addTrack": {
      const song = payload?.song;
      if (!isValidSong(song)) {
        return { ok: false, status: 400, error: "Invalid song payload" };
      }
      if (state.queue.length >= PARTY_MAX_QUEUE) {
        return { ok: false, status: 429, error: "Queue is full" };
      }
      const wire = apply(roomId, (s) => {
        s.queue.push({
          queueId: generateId(10),
          song: {
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            artwork: song.artwork,
            duration: song.duration,
            streamUrl: song.streamUrl,
            provider: song.provider,
          },
          addedBy: memberId,
          addedByName: member.name,
        });
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "removeTrack": {
      const queueId = typeof payload?.queueId === "string" ? payload.queueId : null;
      if (!queueId) return { ok: false, status: 400, error: "Missing queueId" };
      const track = state.queue.find((t) => t.queueId === queueId);
      if (!track) return { ok: false, status: 404, error: "Track not in queue" };
      const canRemove = isHost(state, memberId) || track.addedBy === memberId;
      if (!canRemove) {
        return { ok: false, status: 403, error: "Only the host or the person who added it can remove this" };
      }
      const wire = apply(roomId, (s) => {
        const idx = s.queue.findIndex((t) => t.queueId === queueId);
        if (idx === -1) return;
        const removedPlaying = s.playback?.queueId === queueId;
        s.queue.splice(idx, 1);
        if (removedPlaying) {
          const nextIdx = s.queue[idx] ? idx : Math.max(0, s.queue.length - 1);
          startPlayback(s, nextIdx);
        }
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "next": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply(roomId, (s) => {
        if (s.queue.length === 0) {
          s.playback = null;
          return;
        }
        const idx = currentQueueIndex(s);
        startPlayback(s, (idx + 1) % s.queue.length);
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "prev": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply(roomId, (s) => {
        if (s.queue.length === 0) {
          s.playback = null;
          return;
        }
        const idx = currentQueueIndex(s);
        const prevIdx = idx > 0 ? idx - 1 : s.queue.length - 1;
        startPlayback(s, prevIdx);
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "play": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply(roomId, (s) => {
        if (!s.playback || !s.playback.queueId) {
          startPlayback(s, s.queue.length > 0 ? 0 : -1);
          return;
        }
        const now = Date.now();
        if (s.playback.paused) {
          const pos = (s.playback.pausedAt ?? now) / 1000 - s.playback.startedAt / 1000 + s.playback.positionAtStart;
          s.playback = {
            ...s.playback,
            startedAt: now,
            positionAtStart: Math.max(0, pos),
            paused: false,
            pausedAt: null,
          };
        }
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "pause": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply(roomId, (s) => {
        if (s.playback && !s.playback.paused) {
          s.playback = { ...s.playback, paused: true, pausedAt: Date.now() };
        }
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "seek": {
      const denied = requiresHost();
      if (denied) return denied;
      const seconds = Number(payload?.seconds);
      if (!Number.isFinite(seconds) || seconds < 0) {
        return { ok: false, status: 400, error: "Invalid seek position" };
      }
      const wire = apply(roomId, (s) => {
        if (!s.playback) return;
        const now = Date.now();
        s.playback = {
          ...s.playback,
          startedAt: now,
          positionAtStart: seconds,
          pausedAt: s.playback.paused ? now : null,
        };
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "setVibe": {
      const denied = requiresHost();
      if (denied) return denied;
      const vibe = payload?.vibeId;
      if (typeof vibe !== "string" || !isVibe(vibe)) {
        return { ok: false, status: 400, error: "Invalid vibe" };
      }
      const wire = apply(roomId, (s) => {
        s.vibeId = vibe;
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "clearQueue": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply(roomId, (s) => {
        s.queue = [];
        s.playback = null;
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    case "heartbeat": {
      touchMember(state, memberId);
      return { ok: true, state: toWireState(state) };
    }

    case "reaction": {
      const emoji = payload?.emoji;
      if (typeof emoji !== "string" || !(PARTY_EMOJIS as readonly string[]).includes(emoji)) {
        return { ok: false, status: 400, error: "Invalid reaction emoji" };
      }
      const wire = apply(roomId, (s) => {
        const reaction: PartyReaction = {
          id: generateId(10),
          memberId,
          memberName: member.name,
          emoji,
          at: Date.now(),
        };
        s.reactions.push(reaction);
      });
      return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
    }

    default:
      return { ok: false, status: 400, error: `Unknown command: ${command}` };
  }
}

/**
 * Periodic maintenance (started once per Node process):
 * - notifies subscribers (keeps SSE connections alive and prunes dead ones)
 * - prunes stale reactions
 * - evicts idle members (promoting the oldest active member as host)
 * - deletes long-idle empty rooms
 */
let maintenanceStarted = false;

function startMaintenance(): void {
  if (maintenanceStarted) return;
  maintenanceStarted = true;

  setInterval(() => {
    const now = Date.now();

    for (const [roomId, state] of rooms) {
      const alive = state.members.filter(
        (m) => now - m.lastSeen < PARTY_MEMBER_IDLE_MS,
      );
      const reactionsLengthBefore = state.reactions.length;
      const changed =
        alive.length !== state.members.length ||
        (state.hostId !== alive[0]?.id);

      if (alive.length > 0) {
        alive[0].isHost = true;
        alive[0].lastSeen = Math.max(alive[0].lastSeen, now);
        state.hostId = alive[0].id;
      }

      state.reactions = state.reactions.filter(
        (r) => now - r.at < PARTY_REACTION_TTL_MS,
      );

      const reactionsChanged = reactionsLengthBefore !== state.reactions.length;

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
        for (const sub of set) sub.enqueue(wire);
      }
    }
  }, 25_000);
}

startMaintenance();
