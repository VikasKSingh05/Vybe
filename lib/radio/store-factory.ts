import Redis from "ioredis";
import type { RadioStore } from "./store-interface";
import { memoryRadioStore } from "./store-memory";
import { createRedisRadioStore, type RedisClient } from "./store-redis";

let instance: RadioStore | null = null;
let redisAvailable = true;

function connectRedis(): RedisClient {
  const url = process.env.REDIS_URL!;
  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableOfflineQueue: false,
  });

  // ioredis emits 'error' for connection failures. Without a listener those
  // events are unhandled and can take down the serverless invocation.
  redis.on("error", (error: Error) => {
    if (!redisAvailable) return;
    console.error("[radio] Redis unavailable; using in-memory state", error.message);
    redisAvailable = false;
    instance = memoryRadioStore;
    redis.disconnect();
  });

  // store-redis takes a deliberately small client interface so tests can
  // inject a fake; ioredis satisfies it at runtime but its overloads are too
  // wide for structural typing.
  return redis as unknown as RedisClient;
}

function degradeToMemory(error: unknown): void {
  if (!redisAvailable) return;
  console.error("[radio] Redis store failed; using in-memory state", error);
  redisAvailable = false;
  instance = memoryRadioStore;
}

async function viaStore<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    degradeToMemory(error);
    return fallback();
  }
}

/**
 * Redis is the source of truth when configured, but a dead or misconfigured
 * URL must never take VYBE LIVE offline. Any Redis failure degrades the whole
 * process to the in-memory store, which keeps the endpoint answering 200.
 */
function resilientStore(primary: RadioStore): RadioStore {
  return {
    getStation: () => viaStore(() => primary.getStation(), () => memoryRadioStore.getStation()),
    getWire: () => viaStore(() => primary.getWire(), () => memoryRadioStore.getWire()),
    reconcile: () => viaStore(() => primary.reconcile(), () => memoryRadioStore.reconcile()),
    advance: (reason, expectedVersion) =>
      viaStore(
        () => primary.advance(reason, expectedVersion),
        () => memoryRadioStore.advance(reason, expectedVersion),
      ),
    reportFailure: (refId, expectedVersion) =>
      viaStore(
        () => primary.reportFailure(refId, expectedVersion),
        () => memoryRadioStore.reportFailure(refId, expectedVersion),
      ),
    reportDuration: (refId, durationMs, expectedVersion) =>
      viaStore(
        () => primary.reportDuration(refId, durationMs, expectedVersion),
        () => memoryRadioStore.reportDuration(refId, durationMs, expectedVersion),
      ),
    startMaintenance: () => {
      void viaStore(
        () => Promise.resolve(primary.startMaintenance()),
        () => Promise.resolve(memoryRadioStore.startMaintenance()),
      ).catch(() => {
        // maintenance is best-effort
      });
    },
  };
}

export function getRadioStore(): RadioStore {
  if (instance) return instance;
  if (process.env.REDIS_URL && redisAvailable) {
    instance = resilientStore(createRedisRadioStore(connectRedis()));
  } else {
    instance = memoryRadioStore;
  }
  return instance;
}

export function startRadioMaintenance(): void | Promise<void> {
  return getRadioStore().startMaintenance();
}
