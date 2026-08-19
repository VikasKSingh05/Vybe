/**
 * Redis-backed PartyStore. Requires the `ioredis` package and a REDIS_URL
 * environment variable. Provides persistence across restarts and shared state
 * across multiple Next.js server instances.
 *
 *   npm install ioredis
 *   REDIS_URL=redis://localhost:6379
 */
import type { Song } from "@/types/music";
import type { VibeId } from "@/data/types";
import type {
  PartyMember,
  PartyPatch,
  PartyReaction,
  PartyState,
  PartyTrack,
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
import type { DispatchResult, Envelope, PartyStore, SubscribeFn } from "./store-interface";
import { toWireState } from "./clock";

const ROOM_KEY_PREFIX = "vybe:room:";
const ROOM_CHANNEL_PREFIX = "vybe:channel:";
const ROOM_TTL_SECONDS = Math.ceil(PARTY_ROOM_TTL_MS / 1000) + 300;

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

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
}

export function createRedisStore(redis: RedisClient): PartyStore {
  const subscribers = new Map<string, Set<({ memberId: string | null; enqueue: (msg: Envelope) => void })>>();

  async function loadRoom(roomId: string): Promise<PartyState | null> {
    const raw = await redis.get(ROOM_KEY_PREFIX + roomId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PartyState;
    } catch {
      return null;
    }
  }

  async function saveRoom(state: PartyState): Promise<void> {
    await redis.set(
      ROOM_KEY_PREFIX + state.roomId,
      JSON.stringify(state),
      "EX",
      ROOM_TTL_SECONDS,
    );
  }

  function publish(roomId: string, msg: Envelope): void {
    const channelSubs = subscribers.get(roomId);
    if (!channelSubs) return;
    for (const sub of channelSubs) sub.enqueue(msg);
  }

  function buildPatch(
    prev: { hostId: string; vibeId: string; members: PartyMember[]; queue: PartyTrack[]; playback: PartyState["playback"]; reactions: PartyReaction[]; version: number },
    wire: PartyState,
  ): PartyPatch | null {
    const patch: PartyPatch = { version: wire.version, serverNow: Date.now() };
    let hasDiff = false;
    if (prev.hostId !== wire.hostId) { patch.hostId = wire.hostId; hasDiff = true; }
    if (prev.vibeId !== wire.vibeId) { patch.vibeId = wire.vibeId; hasDiff = true; }
    if (prev.members !== wire.members) { patch.members = wire.members; hasDiff = true; }
    if (prev.queue !== wire.queue) { patch.queue = wire.queue; hasDiff = true; }
    if (prev.playback !== wire.playback) { patch.playback = wire.playback; hasDiff = true; }
    if (prev.reactions !== wire.reactions) { patch.reactions = wire.reactions; hasDiff = true; }
    return hasDiff ? patch : null;
  }

  async function apply(roomId: string, mutator: (s: PartyState) => void): Promise<PartyState | null> {
    const state = await loadRoom(roomId);
    if (!state) return null;

    const prevSnapshot = {
      hostId: state.hostId,
      vibeId: state.vibeId,
      version: state.version,
      members: state.members.slice(),
      queue: state.queue.slice(),
      playback: state.playback ? { ...state.playback } : null,
      reactions: state.reactions.slice(),
    };

    mutator(state);
    state.version += 1;

    await saveRoom(state);

    const wire = toWireState(state);
    const patch = buildPatch(prevSnapshot, wire);
    if (patch) {
      publish(roomId, { event: "patch", data: patch });
    }
    return wire;
  }

  const store: PartyStore = {
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
        version: 0,
        serverNow: Date.now(),
      };

      saveRoom(state).catch(() => {});
      return { roomId, member, state: toWireState(state) };
    },

    joinRoom(roomId: string, name: string) {
      return (async () => {
        const state = await loadRoom(roomId);
        if (!state) return { ok: false as const, status: 404, error: "Room not found" };
        if (state.members.length >= PARTY_MAX_MEMBERS) {
          return { ok: false as const, status: 429, error: "Room is full" };
        }
        const member: PartyMember = {
          id: generateId(10),
          name: sanitizeName(name, "Guest"),
          isHost: state.members.length === 0,
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        };
        const wire = await apply(roomId, (s) => {
          s.members.push(member);
        });
        if (!wire) return { ok: false as const, status: 404, error: "Room not found" };
        return { ok: true as const, member, state: wire };
      })();
    },

    async getRoom(roomId: string) {
      const state = await loadRoom(roomId);
      return state ? toWireState(state) : null;
    },

    subscribe(roomId, memberId, enqueue) {
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
      return (async () => {
        const state = await loadRoom(roomId);
        if (!state) return { ok: false, status: 404, error: "Room not found" };
        const member = state.members.find((m) => m.id === memberId) ?? null;
        if (!member) return { ok: false, status: 403, error: "Not a member of this room" };
        member.lastSeen = Date.now();

        const requiresHost = () => {
          if (state.hostId !== memberId) {
            return { ok: false, status: 403, error: "Only the host can do that" } as DispatchResult;
          }
          return null;
        };

        switch (command) {
          case "leave": {
            const wire = await apply(roomId, (s) => {
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
            if (!isValidSong(song)) return { ok: false, status: 400, error: "Invalid song payload" };
            if (state.queue.length >= PARTY_MAX_QUEUE) return { ok: false, status: 429, error: "Queue is full" };
            const wire = await apply(roomId, (s) => {
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
            const canRemove = state.hostId === memberId || track.addedBy === memberId;
            if (!canRemove) return { ok: false, status: 403, error: "Only the host or the person who added it can remove this" };
            const wire = await apply(roomId, (s) => {
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
            const wire = await apply(roomId, (s) => {
              if (s.queue.length === 0) { s.playback = null; return; }
              const idx = currentQueueIndex(s);
              startPlayback(s, (idx + 1) % s.queue.length);
            });
            return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
          }

          case "prev": {
            const denied = requiresHost();
            if (denied) return denied;
            const wire = await apply(roomId, (s) => {
              if (s.queue.length === 0) { s.playback = null; return; }
              const idx = currentQueueIndex(s);
              const prevIdx = idx > 0 ? idx - 1 : s.queue.length - 1;
              startPlayback(s, prevIdx);
            });
            return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
          }

          case "play": {
            const denied = requiresHost();
            if (denied) return denied;
            const wire = await apply(roomId, (s) => {
              if (!s.playback || !s.playback.queueId) {
                startPlayback(s, s.queue.length > 0 ? 0 : -1);
                return;
              }
              if (s.playback.paused) {
                const now = Date.now();
                const pos = (s.playback.pausedAt ?? now) / 1000 - s.playback.startedAt / 1000 + s.playback.positionAtStart;
                s.playback = { ...s.playback, startedAt: now, positionAtStart: Math.max(0, pos), paused: false, pausedAt: null };
              }
            });
            return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
          }

          case "pause": {
            const denied = requiresHost();
            if (denied) return denied;
            const wire = await apply(roomId, (s) => {
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
            if (!Number.isFinite(seconds) || seconds < 0) return { ok: false, status: 400, error: "Invalid seek position" };
            const wire = await apply(roomId, (s) => {
              if (!s.playback) return;
              const now = Date.now();
              s.playback = { ...s.playback, startedAt: now, positionAtStart: seconds, pausedAt: s.playback.paused ? now : null };
            });
            return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
          }

          case "playTrack": {
            const denied = requiresHost();
            if (denied) return denied;
            const queueId = typeof payload?.queueId === "string" ? payload.queueId : null;
            if (!queueId) return { ok: false, status: 400, error: "Missing queueId" };
            const wire = await apply(roomId, (s) => {
              const idx = s.queue.findIndex((t) => t.queueId === queueId);
              if (idx === -1) return;
              startPlayback(s, idx);
            });
            return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
          }

          case "setVibe": {
            const denied = requiresHost();
            if (denied) return denied;
            const vibe = payload?.vibeId;
            if (typeof vibe !== "string" || !isVibe(vibe)) return { ok: false, status: 400, error: "Invalid vibe" };
            const wire = await apply(roomId, (s) => { s.vibeId = vibe; });
            return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
          }

          case "clearQueue": {
            const denied = requiresHost();
            if (denied) return denied;
            const wire = await apply(roomId, (s) => { s.queue = []; s.playback = null; });
            return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
          }

          case "heartbeat": {
            member.lastSeen = Date.now();
            await saveRoom(state);
            return { ok: true, state: toWireState(state) };
          }

          case "reaction": {
            const emoji = payload?.emoji;
            if (typeof emoji !== "string" || !(PARTY_EMOJIS as readonly string[]).includes(emoji)) {
              return { ok: false, status: 400, error: "Invalid reaction emoji" };
            }
            const wire = await apply(roomId, (s) => {
              s.reactions.push({
                id: generateId(10),
                memberId,
                memberName: member.name,
                emoji,
                at: Date.now(),
              });
            });
            return wire ? { ok: true, state: wire } : { ok: false, status: 404, error: "Room not found" };
          }

          default:
            return { ok: false, status: 400, error: `Unknown command: ${command}` };
        }
      })();
    },

    async startMaintenance() {
      const keys = await redis.keys(ROOM_KEY_PREFIX + "*");
      const now = Date.now();
      for (const key of keys) {
        const raw = await redis.get(key);
        if (!raw) continue;
        const state = JSON.parse(raw) as PartyState;
        const alive = state.members.filter((m) => now - m.lastSeen < PARTY_MEMBER_IDLE_MS);

        if (alive.length > 0) {
          alive[0].isHost = true;
          state.hostId = alive[0].id;
        }
        state.reactions = state.reactions.filter((r) => now - r.at < PARTY_REACTION_TTL_MS);
        state.members = alive;

        if (state.members.length === 0 && now - state.createdAt > PARTY_ROOM_TTL_MS) {
          await redis.del(key);
          continue;
        }
        await saveRoom(state);
      }
    },
  };

  return store;
}
