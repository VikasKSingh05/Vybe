/**
 * Store factory. Uses the in-memory store by default. Set REDIS_URL to
 * switch to the Redis-backed store for multi-instance deployments.
 */
import type { PartyState, PartyMember, VibeId } from "./types";
import type { DispatchResult, Envelope, JoinResult, PartyStore } from "./store-interface";
import { memoryStore } from "./store-memory";

let instance: PartyStore | null = null;

function getRedisStore(): PartyStore {
  // ioredis is optional — only installed when REDIS_URL is set. eval() hides
  // the require from Turbopack/webpack so it doesn't try to resolve at build time.
  // eslint-disable-next-line no-eval
  const ioredis = eval('require("ioredis")');
  const Redis = ioredis.default ?? ioredis;
  const { createRedisStore } = eval('require("./store-redis")') as typeof import("./store-redis");
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
