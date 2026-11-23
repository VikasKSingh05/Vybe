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

let state: StationState | null = null;
let lockTail: Promise<void> = Promise.resolve();

/** Serialise every mutation: a single broadcast must have a single timeline. */
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = lockTail;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  lockTail = previous.then(() => gate);
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function loadOrCreate(nowMs: number): Promise<StationState> {
  const normalized = normalizeState(state);
  if (normalized) return normalized;
  const boot = await bootstrapStation(nowMs);
  state = boot;
  return boot;
}

export const memoryRadioStore: RadioStore = {
  async getStation() {
    return normalizeState(state);
  },

  async getWire() {
    return this.reconcile();
  },

  async reconcile() {
    return withLock(async () => {
      const now = Date.now();
      const before = normalizeState(state);
      const next = await reconcileStation(before, now);
      next.version = nextVersion(before, next);
      state = next;
      return toWire(next, now);
    });
  },

  async advance(reason, expectedVersion) {
    return withLock(async () => {
      const now = Date.now();
      let current = await loadOrCreate(now);
      if (expectedVersion != null && current.version !== expectedVersion) {
        const before = current;
        current = await reconcileStation(before, now);
        current.version = nextVersion(before, current);
        state = current;
        return toWire(current, now);
      }
      current = await advanceStationState(current, reason, now);
      current.version += 1;
      state = current;
      radioLog("store_advance", { stationId: current.stationId, reason, version: current.version });
      return toWire(current, now);
    });
  },

  async reportFailure(refId, expectedVersion) {
    return withLock(async () => {
      const now = Date.now();
      let current = await loadOrCreate(now);
      if (expectedVersion != null && current.version !== expectedVersion) {
        const before = current;
        current = await reconcileStation(before, now);
        current.version = nextVersion(before, current);
        state = current;
        return toWire(current, now);
      }
      recordFailure(current, refId, now);
      if (current.current?.refId === refId) {
        current = await advanceStationState(current, "recovery", now);
      }
      current.version += 1;
      current.updatedAtMs = now;
      state = current;
      return toWire(current, now);
    });
  },

  async reportDuration(refId, durationMs, expectedVersion) {
    return withLock(async () => {
      const now = Date.now();
      const current = await loadOrCreate(now);
      if (expectedVersion != null && current.version !== expectedVersion) {
        return toWire(current, now);
      }
      if (applyReportedDuration(current, refId, durationMs)) {
        current.updatedAtMs = now;
        state = current;
      }
      return toWire(current, now);
    });
  },

  startMaintenance() {
    void this.reconcile().catch(() => {
      // maintenance errors are non-fatal
    });
  },
};
