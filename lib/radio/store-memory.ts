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

const stations = new Map<RadioStationId, StationState>();
const lockTail = new Map<RadioStationId, Promise<void>>();

async function withStationLock<T>(
  stationId: RadioStationId,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = lockTail.get(stationId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  lockTail.set(stationId, prev.then(() => gate));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function loadOrCreate(stationId: RadioStationId): Promise<StationState> {
  const existing = stations.get(stationId);
  if (existing) return existing;
  const boot = await bootstrapStation(stationId, Date.now());
  stations.set(stationId, boot);
  return boot;
}

export const memoryRadioStore: RadioStore = {
  async getStation(stationId) {
    return stations.get(stationId) ?? null;
  },

  async getWire(stationId) {
    return this.reconcile(stationId);
  },

  async listSummaries() {
    const now = Date.now();
    const summaries = await Promise.all(
      allStationIds().map(async (id) => {
        const wire = await this.reconcile(id);
        const meta = getStationDefinition(id);
        return toSummary(wire, { name: meta.name, description: meta.description }, now);
      }),
    );
    return summaries;
  },

  async reconcile(stationId) {
    return withStationLock(stationId, async () => {
      const now = Date.now();
      const before = stations.get(stationId) ?? null;
      const next = await reconcileStation(before, stationId, now);
      let version = before?.version ?? 0;
      if (!before) {
        version = Math.max(1, next.version || 1);
      } else if (
        before.current?.refId !== next.current?.refId ||
        before.startedAtMs !== next.startedAtMs
      ) {
        version += 1;
      }
      next.version = version;
      stations.set(stationId, next);
      return toWire(next, now);
    });
  },

  async advance(stationId, reason, expectedVersion) {
    return withStationLock(stationId, async () => {
      const now = Date.now();
      let state = await loadOrCreate(stationId);
      if (expectedVersion != null && state.version !== expectedVersion) {
        state = await reconcileStation(state, stationId, now);
        return toWire(state, now);
      }
      state = await advanceStationState(state, reason, now);
      state.version += 1;
      stations.set(stationId, state);
      radioLog("store_advance", { stationId, reason, version: state.version });
      return toWire(state, now);
    });
  },

  async reportFailure(stationId, refId, expectedVersion) {
    return withStationLock(stationId, async () => {
      const now = Date.now();
      let state = await loadOrCreate(stationId);
      if (expectedVersion != null && state.version !== expectedVersion) {
        return toWire(await reconcileStation(state, stationId, now), now);
      }
      state.lastFailedRefId = refId;
      if (state.current?.refId === refId) {
        state = await advanceStationState(state, "recovery", now);
      }
      state.version += 1;
      state.updatedAtMs = now;
      stations.set(stationId, state);
      return toWire(state, now);
    });
  },

  startMaintenance() {
    void (async () => {
      for (const id of allStationIds()) {
        try {
          await memoryRadioStore.reconcile(id);
        } catch {
          // maintenance errors are non-fatal
        }
      }
    })();
  },
};
