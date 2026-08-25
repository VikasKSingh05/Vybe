/**
 * Store factory. Uses the in-memory store by default. Set REDIS_URL to
 * switch to the Redis-backed store for multi-instance deployments.
 */
import type { PartyState, PartyMember, VibeId } from "./types";
import type { DispatchResult, Envelope, JoinResult, PartyStore } from "./store-interface";
import { memoryStore } from "./store-memory";
// Static import is safe: store-redis receives the client via injection and
// never touches the ioredis package itself (which stays eval'd below so the
// bundler never tries to resolve it at build time).
import { createRedisStore } from "./store-redis";

let instance: PartyStore | null = null;

function getRedisStore(): PartyStore {
  // ioredis must be a real dependency; next.config.ts pins it into the
  // serverless trace via outputFileTracingIncludes because this eval'd
  // require is invisible to file tracing.
  // eslint-disable-next-line no-eval
  const ioredis = eval('require("ioredis")');
  const Redis = ioredis.default ?? ioredis;
  const url = process.env.REDIS_URL!;
  const redis = new Redis(url, { maxRetriesPerRequest: 3 });
  return createRedisStore(redis);
}

export function getStore(): PartyStore {
  if (instance) return instance;
  if (process.env.REDIS_URL) {
    instance = getRedisStore();
  } else {
    instance = memoryStore;
  }
  return instance;
}

export function createRoom(hostName: string, vibeId: VibeId) {
  return getStore().createRoom(hostName, vibeId);
}

export function joinRoom(roomId: string, name: string): JoinResult | Promise<JoinResult> {
  return getStore().joinRoom(roomId, name);
}

export function getRoom(roomId: string): PartyState | null | Promise<PartyState | null> {
  return getStore().getRoom(roomId);
}

export function subscribe(
  roomId: string,
  memberId: string | null,
  enqueue: (msg: Envelope) => void,
): () => void {
  return getStore().subscribe(roomId, memberId, enqueue);
}

export function dispatch(
  roomId: string,
  memberId: string,
  command: string,
  payload: Record<string, unknown> | undefined,
): DispatchResult | Promise<DispatchResult> {
  return getStore().dispatch(roomId, memberId, command, payload);
}

export function startMaintenance(): void | Promise<void> {
  return getStore().startMaintenance();
}

export type { DispatchResult, Envelope, JoinResult, PartyStore } from "./store-interface";
