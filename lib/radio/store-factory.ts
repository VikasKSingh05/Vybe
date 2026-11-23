import type { RadioStore } from "./store-interface";
import { memoryRadioStore } from "./store-memory";
import { createRedisRadioStore } from "./store-redis";

let instance: RadioStore | null = null;

function getRedisStore(): RadioStore {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ioredis = require("ioredis");
  const Redis = ioredis.default ?? ioredis;
  const url = process.env.REDIS_URL!;
  const redis = new Redis(url, { maxRetriesPerRequest: 3 });
  return createRedisRadioStore(redis);
}

export function getRadioStore(): RadioStore {
  if (instance) return instance;
  if (process.env.REDIS_URL) {
    instance = getRedisStore();
  } else {
    instance = memoryRadioStore;
  }
  return instance;
}

export function startRadioMaintenance(): void | Promise<void> {
  return getRadioStore().startMaintenance();
}
