import {
  advanceStationState,
  applyReportedDuration,
  bootstrapStation,
  nextVersion,
  normalizeState,
  reconcileStation,
  recordFailure,
  toWire,
} from "./engine";
import { radioLog } from "./logger";
import type { StationState } from "./types";
import type { RadioStore } from "./store-interface";

const KEY = "vybe:radio:live";
const TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_CAS_ATTEMPTS = 5;

interface RedisMulti {
  set(key: string, value: string, ...args: (string | number)[]): RedisMulti;
  exec(): Promise<Array<unknown> | null>;
}

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>;
  watch(key: string): Promise<unknown>;
  unwatch(): Promise<unknown>;
  multi(): RedisMulti;
}

function parseState(raw: string | null): StationState | null {
  if (!raw) return null;
  try {
    return normalizeState(JSON.parse(raw) as StationState);
  } catch {
    return null;
  }
}

/**
 * Redis-backed store for the one shared broadcast.
 *
 * Every mutation WATCHes the key, computes the next state, and commits with
 * MULTI/EXEC. If another listener changed the key in that window EXEC returns
 * null and we recompute from the newest state, so a double-skip or concurrent
 * auto-advance cannot produce two different "current" tracks.
 */
export function createRedisRadioStore(redis: RedisClient): RadioStore {
  async function load(): Promise<StationState | null> {
    return parseState(await redis.get(KEY));
  }

  async function save(state: StationState): Promise<void> {
    await redis.set(KEY, JSON.stringify(state), "EX", TTL_SECONDS);
  }

  async function mutate(
    mutator: (before: StationState | null) => Promise<StationState>,
    versionFor: (before: StationState | null, next: StationState) => number,
  ): Promise<StationState> {
    for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
      await redis.watch(KEY);
      try {
        const before = await load();
        const next = await mutator(before);
        next.version = versionFor(before, next);

        const tx = redis.multi();
        tx.set(KEY, JSON.stringify(next), "EX", TTL_SECONDS);
        const result = await tx.exec();
        if (result !== null) return next;
      } finally {
        await redis.unwatch();
      }
    }

    const existing = await load();
    if (existing) return existing;
    const boot = await bootstrapStation(Date.now());
    await save(boot);
    return boot;
  }

  function versionForAdvance(
    before: StationState | null,
    next: StationState,
    expectedVersion?: number,
  ): number {
    if (expectedVersion != null && before && before.version !== expectedVersion) {
      return nextVersion(before, next);
    }
    return (before?.version ?? 0) + 1;
  }

  return {
    async getStation() {
      return load();
    },

    async getWire() {
      return this.reconcile();
    },

    async reconcile() {
      const now = Date.now();
      const state = await mutate(
        async (before) => reconcileStation(before, now),
        (before, next) => nextVersion(before, next),
      );
      return toWire(state, now);
    },

    async advance(reason, expectedVersion) {
      const now = Date.now();
      const state = await mutate(
        async (before) => {
          const current = before ?? (await bootstrapStation(now));
          if (expectedVersion != null && current.version !== expectedVersion) {
            return reconcileStation(current, now);
          }
          return advanceStationState(current, reason, now);
        },
        (before, next) => versionForAdvance(before, next, expectedVersion),
      );
      radioLog("redis_advance", { stationId: state.stationId, reason, version: state.version });
      return toWire(state, now);
    },

    async reportFailure(refId, expectedVersion) {
      const now = Date.now();
      const state = await mutate(
        async (before) => {
          let current = before ?? (await bootstrapStation(now));
          if (expectedVersion != null && current.version !== expectedVersion) {
            return reconcileStation(current, now);
          }
          recordFailure(current, refId, now);
          if (current.current?.refId === refId) {
            current = await advanceStationState(current, "recovery", now);
          }
          current.updatedAtMs = now;
          return current;
        },
        (before, next) => versionForAdvance(before, next, expectedVersion),
      );
      return toWire(state, now);
    },

    async reportDuration(refId, durationMs, expectedVersion) {
      const now = Date.now();
      const state = await mutate(
        async (before) => {
          const current = before ?? (await bootstrapStation(now));
          if (expectedVersion != null && current.version !== expectedVersion) return current;
          if (applyReportedDuration(current, refId, durationMs)) {
            current.updatedAtMs = now;
          }
          return current;
        },
        (before, next) => before?.version ?? next.version,
      );
      return toWire(state, now);
    },

    startMaintenance() {
      void this.reconcile().catch(() => {
        // maintenance errors are non-fatal
      });
    },
  };
}
