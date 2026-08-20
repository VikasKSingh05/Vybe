/**
 * Redis-backed PartyStore. Requires the `ioredis` package and a REDIS_URL
 * environment variable. Provides persistence across restarts and shared state
 * across multiple Next.js server instances.
 *
 *   npm install ioredis
 *   REDIS_URL=redis://localhost:6379
 */
import type { VibeId } from "@/data/types";
import type {
  PartyMember,
  PartyPatch,
  PartyReaction,
  PartyState,
  PartyTrack,
} from "./types";
import {
  PARTY_MAX_MEMBERS,
  PARTY_MEMBER_IDLE_MS,
  PARTY_REACTION_TTL_MS,
  PARTY_ROOM_TTL_MS,
} from "./types";
import type { DispatchResult, Envelope, PartyStore, SubscribeFn } from "./store-interface";
import { toWireState } from "./clock";
import { dispatchCommand, generateId, sanitizeName, type ApplyFn } from "./dispatch-commands";

const ROOM_KEY_PREFIX = "vybe:room:";
const ROOM_TTL_SECONDS = Math.ceil(PARTY_ROOM_TTL_MS / 1000) + 300;

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: string, ...args: (string | number)[]): Promise<[string, string[]]>;
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
    if (JSON.stringify(prev.members) !== JSON.stringify(wire.members)) { patch.members = wire.members; hasDiff = true; }
    if (JSON.stringify(prev.queue) !== JSON.stringify(wire.queue)) { patch.queue = wire.queue; hasDiff = true; }
    if (JSON.stringify(prev.playback) !== JSON.stringify(wire.playback)) { patch.playback = wire.playback; hasDiff = true; }
    if (JSON.stringify(prev.reactions) !== JSON.stringify(wire.reactions)) { patch.reactions = wire.reactions; hasDiff = true; }
    return hasDiff ? patch : null;
  }

  async function apply(roomId: string, mutator: (s: PartyState) => void, memberId?: string): Promise<PartyState | null> {
    const state = await loadRoom(roomId);
    if (!state) return null;

    if (memberId) {
      const member = state.members.find((m) => m.id === memberId);
      if (member) member.lastSeen = Date.now();
    }

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
          if (s.members.length === 1) {
            s.hostId = member.id;
          }
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

        if (command === "heartbeat") {
          member.lastSeen = Date.now();
          await saveRoom(state);
          return { ok: true, state: toWireState(state) };
        }

        const asyncApply: ApplyFn = (mutator) => apply(roomId, mutator, memberId);
        return dispatchCommand(state, member, command, payload, asyncApply);
      })();
    },

    async startMaintenance() {
      const keys: string[] = [];
      let cursor = "0";
      do {
        const [nextCursor, batch] = await redis.scan(cursor, "MATCH", ROOM_KEY_PREFIX + "*", "COUNT", 100);
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== "0");

      const now = Date.now();
      for (const key of keys) {
        try {
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
            subscribers.delete(key.slice(ROOM_KEY_PREFIX.length));
            continue;
          }
          await saveRoom(state);
        } catch {
          // Skip corrupted room to avoid blocking cleanup of other rooms
        }
      }
    },
  };

  return store;
}
