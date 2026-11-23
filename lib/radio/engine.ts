import { RADIO_ENGINE_CONFIG, RADIO_STATION_ID, getStationDefinition } from "./config";
import { discoverCandidates, fillQueue, seedCandidates } from "./queue-manager";
import { shouldAdvanceTrack, wireState } from "./position";
import { radioLog, radioWarn } from "./logger";
import type {
  AdvanceReason,
  StationState,
  StationTrack,
  StationWire,
} from "./types";

export { getStationDefinition };

export function emptyState(): StationState {
  return {
    stationId: RADIO_STATION_ID,
    version: 0,
    status: "loading",
    current: null,
    startedAtMs: 0,
    queue: [],
    history: [],
    updatedAtMs: Date.now(),
    failedTracks: [],
  };
}

/** Guard against older or partially written persisted states. */
export function normalizeState(raw: StationState | null | undefined): StationState | null {
  if (!raw || typeof raw !== "object") return null;
  const base = emptyState();
  return {
    ...base,
    ...raw,
    stationId: RADIO_STATION_ID,
    version: Number.isFinite(raw.version) ? raw.version : 0,
    queue: Array.isArray(raw.queue) ? raw.queue : [],
    history: Array.isArray(raw.history) ? raw.history : [],
    failedTracks: Array.isArray(raw.failedTracks) ? raw.failedTracks : [],
  };
}

function pushHistory(state: StationState, refId: string): void {
  state.history.push(refId);
  if (state.history.length > RADIO_ENGINE_CONFIG.historyMax) {
    state.history.splice(0, state.history.length - RADIO_ENGINE_CONFIG.historyMax);
  }
}

function activeCooldownRefIds(state: StationState, nowMs: number): Set<string> {
  const cutoff = nowMs - RADIO_ENGINE_CONFIG.failedTrackCooldownMs;
  return new Set(
    state.failedTracks
      .filter((failure) => failure.failedAtMs > cutoff)
      .map((failure) => failure.refId),
  );
}

async function ensureQueue(state: StationState, nowMs: number): Promise<void> {
  if (state.queue.length >= RADIO_ENGINE_CONFIG.lowWaterMark) return;
  state.queue = await fillQueue(
    state.queue,
    state.history,
    state.current,
    RADIO_ENGINE_CONFIG.queueTarget,
    activeCooldownRefIds(state, nowMs),
  );
}

async function pickInitialCurrent(): Promise<StationTrack | null> {
  try {
    const discovered = await discoverCandidates(RADIO_ENGINE_CONFIG.discoveryBatchSize, new Set());
    if (discovered.length > 0) return discovered[0];
  } catch {
    // Fall through to curated seeds when the upstream is unavailable.
  }
  return seedCandidates()[0] ?? null;
}

export async function bootstrapStation(nowMs: number): Promise<StationState> {
  const state = emptyState();
  state.status = "loading";
  state.updatedAtMs = nowMs;

  const current = await pickInitialCurrent();
  if (!current) {
    state.status = "unavailable";
    radioWarn("bootstrap_empty", { stationId: RADIO_STATION_ID });
    return state;
  }

  state.current = current;
  state.startedAtMs = nowMs;
  state.status = "live";
  pushHistory(state, current.refId);
  state.queue = await fillQueue(
    [],
    state.history,
    current,
    RADIO_ENGINE_CONFIG.queueTarget,
    activeCooldownRefIds(state, nowMs),
  );
  state.version = 1;

  radioLog("station_initialized", {
    stationId: RADIO_STATION_ID,
    track: current.refId,
    queueSize: state.queue.length,
  });

  return state;
}

export async function advanceStationState(
  state: StationState,
  reason: AdvanceReason,
  nowMs: number,
): Promise<StationState> {
  let attempts = 0;
  let next: StationTrack | null = null;
  const coolingDown = activeCooldownRefIds(state, nowMs);

  if (state.current) {
    pushHistory(state, state.current.refId);
  }

  while (attempts < RADIO_ENGINE_CONFIG.maxAdvanceAttempts) {
    attempts += 1;
    await ensureQueue(state, nowMs);

    if (state.queue.length === 0) {
      state.queue = await fillQueue(
        [],
        state.history,
        null,
        RADIO_ENGINE_CONFIG.queueTarget,
        coolingDown,
      );
    }

    if (state.queue.length === 0) {
      const fallback = seedCandidates().find(
        (t) => !coolingDown.has(t.refId) && t.refId !== state.current?.refId,
      );
      if (fallback) {
        next = fallback;
        break;
      }
      state.status = "recovering";
      state.updatedAtMs = nowMs;
      radioWarn("advance_no_candidates", { stationId: RADIO_STATION_ID, reason, attempts });
      return state;
    }

    const candidate = state.queue.shift()!;
    if (coolingDown.has(candidate.refId) || candidate.refId === state.current?.refId) {
      continue;
    }
    next = candidate;
    break;
  }

  if (!next) {
    state.status = "recovering";
    state.updatedAtMs = nowMs;
    return state;
  }

  state.current = next;
  state.startedAtMs = nowMs;
  state.status = "live";
  state.updatedAtMs = nowMs;
  pushHistory(state, next.refId);

  await ensureQueue(state, nowMs);

  radioLog("station_advanced", {
    stationId: RADIO_STATION_ID,
    reason,
    track: next.refId,
    queueSize: state.queue.length,
    version: state.version,
  });

  return state;
}

export async function reconcileStation(
  state: StationState | null,
  nowMs: number,
): Promise<StationState> {
  const current = normalizeState(state);
  if (!current) {
    return bootstrapStation(nowMs);
  }

  if (current.status === "unavailable" && !current.current) {
    return bootstrapStation(nowMs);
  }

  if (shouldAdvanceTrack(current, nowMs)) {
    return advanceStationState(current, "auto", nowMs);
  }

  if (current.queue.length < RADIO_ENGINE_CONFIG.lowWaterMark) {
    current.queue = await fillQueue(
      current.queue,
      current.history,
      current.current,
      RADIO_ENGINE_CONFIG.queueTarget,
      activeCooldownRefIds(current, nowMs),
    );
    current.updatedAtMs = nowMs;
  }

  return current;
}

export function toWire(state: StationState, nowMs: number): StationWire {
  return wireState(state, nowMs);
}

/** Bump the broadcast version only when listeners would hear a different track. */
export function nextVersion(before: StationState | null, next: StationState): number {
  if (!before) return Math.max(1, next.version || 1);
  if (
    before.current?.refId !== next.current?.refId ||
    before.startedAtMs !== next.startedAtMs
  ) {
    return before.version + 1;
  }
  return before.version;
}

/** Record a failed track so it stays out of rotation for the cooldown window. */
export function recordFailure(state: StationState, refId: string, nowMs: number): void {
  const cutoff = nowMs - RADIO_ENGINE_CONFIG.failedTrackCooldownMs;
  state.failedTracks = [
    { refId, failedAtMs: nowMs },
    ...state.failedTracks.filter(
      (failure) => failure.refId !== refId && failure.failedAtMs > cutoff,
    ),
  ].slice(0, RADIO_ENGINE_CONFIG.failedTrackHistoryMax);
}

/**
 * Apply the real duration reported by the listener once the stream metadata is
 * known. This corrects the fallback duration used by discovery results. The
 * version is deliberately unchanged so clients do not restart playback.
 */
export function applyReportedDuration(
  state: StationState,
  refId: string,
  durationMs: number,
): boolean {
  if (!state.current || state.current.refId !== refId) return false;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return false;
  const rounded = Math.round(durationMs);
  if (Math.abs(state.current.durationMs - rounded) < 1000) return false;
  state.current = { ...state.current, durationMs: rounded };
  return true;
}
