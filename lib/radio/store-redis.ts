import {
  advanceStationState,
  bootstrapStation,
  reconcileStation,
  toWire,
  allStationIds,
  getStationDefinition,
} from "./engine";
import { toSummary } from "./position";
import type { AdvanceReason, RadioStationId, StationState } from "./types";
import type { RadioStore } from "./store-interface";
import { radioLog } from "./logger";

const KEY_PREFIX = "vybe:radio:";
const TTL_SECONDS = 60 * 60 * 24 * 7;

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>;
}

export function createRedisRadioStore(redis: RedisClient): RadioStore {
  async function load(stationId: RadioStationId): Promise<StationState | null> {
    const raw = await redis.get(KEY_PREFIX + stationId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StationState;
    } catch {
      return null;
    }
  }

  async function save(state: StationState): Promise<void> {
    await redis.set(KEY_PREFIX + state.stationId, JSON.stringify(state), "EX", TTL_SECONDS);
  }

  async function mutate(
    stationId: RadioStationId,
    mutator: (state: StationState | null) => Promise<StationState>,
  ): Promise<StationState> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const before = await load(stationId);
      const beforeVersion = before?.version ?? -1;
      const next = await mutator(before);
      if (!before) {
        next.version = Math.max(1, next.version || 1);
      } else if (
        before.current?.refId !== next.current?.refId ||
        before.startedAtMs !== next.startedAtMs
      ) {
        next.version = beforeVersion + 1;
      } else {
        next.version = beforeVersion;
      }
      await save(next);
      const verify = await load(stationId);
      if (verify && verify.version === next.version) {
        return verify;
      }
    }
    const fallback = await load(stationId);
    if (fallback) return fallback;
    const boot = await bootstrapStation(stationId, Date.now());
    await save(boot);
    return boot;
  }

  return {
    async getStation(stationId) {
      return load(stationId);
    },

    async getWire(stationId) {
      return this.reconcile(stationId);
    },

    async listSummaries() {
      const now = Date.now();
      return Promise.all(
        allStationIds().map(async (id) => {
          const wire = await this.reconcile(id);
          const meta = getStationDefinition(id);
          return toSummary(wire, { name: meta.name, description: meta.description }, now);
        }),
      );
    },

    async reconcile(stationId) {
      const now = Date.now();
      const state = await mutate(stationId, async (before) =>
        reconcileStation(before, stationId, now),
      );
      return toWire(state, now);
    },

    async advance(stationId, reason, expectedVersion) {
      const now = Date.now();
      const state = await mutate(stationId, async (before) => {
        let state = before ?? (await bootstrapStation(stationId, now));
        if (expectedVersion != null && state.version !== expectedVersion) {
          return reconcileStation(state, stationId, now);
        }
        return advanceStationState(state, reason, now);
      });
      radioLog("redis_advance", { stationId, reason, version: state.version });
      return toWire(state, now);
    },

    async reportFailure(stationId, refId, expectedVersion) {
      const now = Date.now();
      const state = await mutate(stationId, async (before) => {
        let state = before ?? (await bootstrapStation(stationId, now));
        if (expectedVersion != null && state.version !== expectedVersion) {
          return reconcileStation(state, stationId, now);
        }
        state.lastFailedRefId = refId;
        if (state.current?.refId === refId) {
          return advanceStationState(state, "recovery", now);
        }
        state.updatedAtMs = now;
        return state;
      });
      return toWire(state, now);
    },

    startMaintenance() {
      void (async () => {
        for (const id of allStationIds()) {
          try {
            await this.reconcile(id);
          } catch {
            // ignore
          }
        }
      })();
    },
  };
}
