/**
 * Redis-backed PartyStore. Requires the `ioredis` package and a REDIS_URL
 * environment variable. Provides persistence across restarts, shared state
 * across multiple Next.js server instances, and cross-instance real-time
 * notifications via Redis PUB/SUB.
 *
 * Every mutation uses WATCH/MULTI/EXEC (compare-and-set). Without this, two
 * concurrent commands — e.g. a host transfer and the old host's last `pause`
 * — could both pass authorization against the same snapshot and the second
 * write would silently overwrite the transfer, leaving the party hostless.
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
} from "./types";
import type { Envelope, PartyStore } from "./store-interface";
import { toWireState } from "./clock";
import { dispatchCommand, generateId, sanitizeName, type ApplyFn } from "./dispatch-commands";
import { ensureValidHost } from "./host";

const ROOM_KEY_PREFIX = "vybe:room:";
// Rooms are deleted as soon as they are empty; the TTL is only a safety net
// for crashed processes.
const ROOM_TTL_SECONDS = Math.ceil(PARTY_MEMBER_IDLE_MS / 1000) + 300;
const CHANNEL_PREFIX = "vybe:events:";
const CAS_RETRIES = 5;
const VALID_MEMBER_ID = /^[a-zA-Z0-9_-]{6,64}$/;

interface RedisMulti {
  set(key: string, value: string, ...args: (string | number)[]): RedisMulti;
  del(key: string): RedisMulti;
  exec(): Promise<Array<unknown> | null>;
}

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: string, ...args: (string | number)[]): Promise<[string, string[]]>;
  publish(channel: string, message: string): Promise<unknown>;
  subscribe(...channels: string[]): Promise<unknown>;
  unsubscribe(...channels: string[]): Promise<unknown>;
  watch(key: string): Promise<unknown>;
  unwatch(): Promise<unknown>;
  multi(): RedisMulti;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): void;
  duplicate(): RedisClient;
}

type Snapshot = {
  hostId: string;
  vibeId: VibeId;
  version: number;
  members: PartyMember[];
  queue: PartyTrack[];
  playback: PartyState["playback"];
  reactions: PartyReaction[];
  locked: boolean;
};

export function createRedisStore(redis: RedisClient): PartyStore {
  const subscribers = new Map<string, Set<{ memberId: string | null; enqueue: (msg: Envelope) => void }>>();
  const localRefCount = new Map<string, number>();

  // Dedicated connection for WATCH. Redis WATCH state is per-connection, so
  // commands must never be issued on the normal client while a watch is open.
  const cas = redis.duplicate();
  // A subscribed connection cannot issue regular commands.
  const sub = redis.duplicate();
  sub.on("message", (channel: string, message: string) => {
    const roomId = channel.slice(CHANNEL_PREFIX.length);
    const channelSubs = subscribers.get(roomId);
    if (!channelSubs) return;
    try {
      const envelope = JSON.parse(message) as Envelope;
      for (const s of channelSubs) s.enqueue(envelope);
    } catch {
      // malformed frame — ignore
    }
  });

  function snapshot(state: PartyState): Snapshot {
    // Deep copy: commands mutate members/queue entries in place, so a shallow
    // copy would diff to "no change" and silently drop the patch.
    return structuredClone({
      hostId: state.hostId,
      vibeId: state.vibeId,
      version: state.version,
      members: state.members,
      queue: state.queue,
      playback: state.playback,
      reactions: state.reactions.slice(-20),
      locked: state.locked,
    });
  }

  function buildPatch(prev: Snapshot, wire: PartyState): PartyPatch | null {
    const patch: PartyPatch = { version: wire.version, serverNow: Date.now() };
    let hasDiff = prev.hostId !== wire.hostId || prev.vibeId !== wire.vibeId || prev.locked !== wire.locked;
    if (!hasDiff) {
      hasDiff = (["members", "queue", "playback", "reactions"] as const).some(
        (key) => JSON.stringify(prev[key]) !== JSON.stringify(wire[key]),
      );
    }
    if (!hasDiff) return null;
    patch.hostId = wire.hostId;
    patch.vibeId = wire.vibeId;
    patch.locked = wire.locked;
    patch.members = wire.members;
    patch.queue = wire.queue;
    patch.playback = wire.playback;
    patch.reactions = wire.reactions;
    return patch;
  }

  /** Notify all local SSE connections AND broadcast via Redis PUB/SUB. */
  function publish(roomId: string, msg: Envelope): void {
    const channelSubs = subscribers.get(roomId);
    if (channelSubs) {
      for (const s of channelSubs) s.enqueue(msg);
    }
    redis.publish(CHANNEL_PREFIX + roomId, JSON.stringify(msg)).catch(() => {});
  }

  async function parseWatched(key: string): Promise<PartyState | null> {
    const raw = await cas.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PartyState;
    } catch {
      return null;
    }
  }

  /**
   * Called after WATCH + read + mutation. Returns null on a CAS conflict so
   * the caller can retry the whole operation (including authorization).
   */
  async function commit(
    key: string,
    roomId: string,
    state: PartyState,
    prev: Snapshot,
    opts: { bumpVersion: boolean; broadcastPatch: boolean },
  ): Promise<PartyState | null> {
    if (opts.bumpVersion) state.version += 1;
    const wire = toWireState(state);
    const empty = state.members.length === 0;
    const multi = cas.multi();
    if (empty) {
      multi.del(key);
    } else {
      multi.set(key, JSON.stringify(state), "EX", ROOM_TTL_SECONDS);
    }
    const result = await multi.exec();
    if (!result) return null; // key changed since WATCH

    if (empty) {
      publish(roomId, { event: "closed" });
    } else if (opts.broadcastPatch) {
      const patch = buildPatch(prev, wire);
      if (patch) publish(roomId, { event: "patch", data: patch });
    }
    return wire;
  }

  const store: PartyStore = {
    async createRoom(hostName: string, vibeId: VibeId) {
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
      // Await the write: returning before the save completes produces a room
      // that immediately 404s for the creator on serverless platforms.
      await redis.set(ROOM_KEY_PREFIX + roomId, JSON.stringify(state), "EX", ROOM_TTL_SECONDS);
      return { roomId, member, state: toWireState(state) };
    },

    async joinRoom(roomId: string, name: string, memberId?: string) {
      const key = ROOM_KEY_PREFIX + roomId;
      for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
        await cas.watch(key);
        const state = await parseWatched(key);
        if (!state) {
          await cas.unwatch();
          return { ok: false as const, status: 404, error: "Room not found" };
        }
        if (state.locked) {
          await cas.unwatch();
          return { ok: false as const, status: 403, error: "Room is locked" };
        }

        const prev = snapshot(state);
        const existing = memberId ? state.members.find((m) => m.id === memberId) : null;
        let member: PartyMember;
        let bumpVersion = false;

        if (existing) {
          // Reattach the same identity; never mint a phantom second host.
          existing.name = sanitizeName(name, existing.name);
          existing.lastSeen = Date.now();
          member = existing;
        } else {
          if (state.members.length >= PARTY_MAX_MEMBERS) {
            await cas.unwatch();
            return { ok: false as const, status: 429, error: "Room is full" };
          }
          member = {
            id: memberId && VALID_MEMBER_ID.test(memberId) ? memberId : generateId(10),
            name: sanitizeName(name, "Guest"),
            joinedAt: Date.now(),
            lastSeen: Date.now(),
          };
          state.members.push(member);
          ensureValidHost(state);
          bumpVersion = true;
        }

        const wire = await commit(key, roomId, state, prev, {
          bumpVersion,
          broadcastPatch: bumpVersion,
        });
        if (!wire) continue;
        return { ok: true as const, member, state: wire };
      }
      return { ok: false as const, status: 409, error: "Room changed, please try again" };
    },

    async getRoom(roomId: string) {
      const raw = await redis.get(ROOM_KEY_PREFIX + roomId);
      if (!raw) return null;
      try {
        return toWireState(JSON.parse(raw) as PartyState);
      } catch {
        return null;
      }
    },

    subscribe(roomId, memberId, enqueue) {
      let set = subscribers.get(roomId);
      if (!set) {
        set = new Set();
        subscribers.set(roomId, set);
      }

      if (set.size === 0) {
        sub.subscribe(CHANNEL_PREFIX + roomId).catch(() => {});
      }

      const subEntry = { memberId, enqueue };
      set.add(subEntry);
      localRefCount.set(roomId, (localRefCount.get(roomId) ?? 0) + 1);

      return () => {
        const current = subscribers.get(roomId);
        if (current) {
          current.delete(subEntry);
          const count = (localRefCount.get(roomId) ?? 1) - 1;
          localRefCount.set(roomId, count);
          if (count <= 0) {
            subscribers.delete(roomId);
            localRefCount.delete(roomId);
            sub.unsubscribe(CHANNEL_PREFIX + roomId).catch(() => {});
          }
        }
      };
    },

    async dispatch(roomId, memberId, command, payload) {
      const key = ROOM_KEY_PREFIX + roomId;
      for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
        await cas.watch(key);
        const state = await parseWatched(key);
        if (!state) {
          await cas.unwatch();
          return { ok: false, status: 404, error: "Room not found" };
        }
        const member = state.members.find((m) => m.id === memberId) ?? null;
        if (!member) {
          await cas.unwatch();
          return { ok: false, status: 403, error: "Not a member of this room" };
        }

        if (command === "heartbeat") {
          member.lastSeen = Date.now();
          const wire = await commit(key, roomId, state, snapshot(state), {
            bumpVersion: false,
            broadcastPatch: false,
          });
          if (wire) return { ok: true, state: wire };
          continue;
        }

        const prev = snapshot(state);
        let mutated = false;
        // The apply callback is synchronous here, so authorization and the
        // mutation both run against the freshly watched state on every retry.
        const applyFn: ApplyFn = (mutator) => {
          mutator(state);
          mutated = true;
          return state;
        };
        const outcome = dispatchCommand(state, member, command, payload, applyFn);
        if (outcome instanceof Promise) {
          await cas.unwatch();
          return { ok: false, status: 500, error: "Unexpected async command" };
        }
        if (!outcome.ok || !mutated) {
          await cas.unwatch();
          return outcome;
        }

        const wire = await commit(key, roomId, state, prev, {
          bumpVersion: true,
          broadcastPatch: true,
        });
        if (!wire) continue; // concurrent write — re-read and re-authorize
        return { ok: true, state: wire };
      }
      return { ok: false, status: 409, error: "Room changed, please try again" };
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
        const roomId = key.slice(ROOM_KEY_PREFIX.length);
        for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
          try {
            await cas.watch(key);
            const state = await parseWatched(key);
            if (!state) {
              await cas.unwatch();
              break;
            }
            const prev = snapshot(state);
            const alive = state.members.filter((m) => now - m.lastSeen < PARTY_MEMBER_IDLE_MS);
            const membersChanged = alive.length !== state.members.length;
            state.members = alive;
            const hostChanged = ensureValidHost(state);

            const beforeLen = state.reactions.length;
            state.reactions = state.reactions.filter((r) => now - r.at < PARTY_REACTION_TTL_MS);
            const reactionsChanged = beforeLen !== state.reactions.length;

            const wire = await commit(key, roomId, state, prev, {
              bumpVersion: membersChanged || hostChanged || reactionsChanged,
              broadcastPatch: false,
            });
            if (!wire) continue;
            if (state.members.length > 0) {
              // Full state replay keeps presence honest across instances.
              publish(roomId, { event: "state", data: wire });
            }
            break;
          } catch {
            await cas.unwatch().catch(() => {});
            break;
          }
        }
      }
    },
  };

  return store;
}
