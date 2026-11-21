import { getPlaylistForGenre } from "@/data/playlists";
import { RADIO_ENGINE_CONFIG, RADIO_STATION_IDS } from "./config";
import { fillQueue, seedCandidates, stationMeta } from "./queue-manager";
import { shouldAdvanceTrack, wireState } from "./position";
import { playlistEntryToStationTrack } from "./track";
import { radioLog, radioWarn } from "./logger";
import type {
  AdvanceReason,
  RadioStationId,
  StationState,
  StationTrack,
  StationWire,
} from "./types";

function emptyState(stationId: RadioStationId): StationState {
  return {
    stationId,
    version: 0,
    status: "loading",
    current: null,
    startedAtMs: 0,
    queue: [],
    history: [],
    updatedAtMs: Date.now(),
  };
}

function pushHistory(state: StationState, refId: string): void {
  state.history.push(refId);
  if (state.history.length > RADIO_ENGINE_CONFIG.historyMax) {
    state.history.splice(0, state.history.length - RADIO_ENGINE_CONFIG.historyMax);
  }
}

async function ensureQueue(state: StationState): Promise<void> {
  if (state.queue.length >= RADIO_ENGINE_CONFIG.lowWaterMark) return;
  state.queue = await fillQueue(
    state.stationId,
    state.queue,
    state.history,
    state.current,
    RADIO_ENGINE_CONFIG.queueTarget,
  );
}

async function pickInitialCurrent(stationId: RadioStationId): Promise<StationTrack | null> {
  const seeds = seedCandidates(stationId);
  return seeds[0] ?? null;
}

export async function bootstrapStation(
  stationId: RadioStationId,
  nowMs: number,
): Promise<StationState> {
  let state = emptyState(stationId);
  state.status = "loading";

  const current = await pickInitialCurrent(stationId);
  if (!current) {
    state.status = "unavailable";
    state.updatedAtMs = nowMs;
    radioWarn("bootstrap_empty", { stationId });
    return state;
  }

  state.current = current;
  state.startedAtMs = nowMs;
  state.status = "live";
  pushHistory(state, current.refId);
  state.queue = await fillQueue(stationId, [], state.history, current, RADIO_ENGINE_CONFIG.queueTarget);
  state.updatedAtMs = nowMs;
  state.version = 1;

  radioLog("station_initialized", {
    stationId,
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
  const stationId = state.stationId;
  let attempts = 0;
  let next: StationTrack | null = null;

  if (state.current) {
    pushHistory(state, state.current.refId);
  }

  while (attempts < RADIO_ENGINE_CONFIG.maxAdvanceAttempts) {
    attempts += 1;
    await ensureQueue(state);

    if (state.queue.length === 0) {
      state.queue = await fillQueue(
        stationId,
        [],
        state.history,
        null,
        RADIO_ENGINE_CONFIG.queueTarget,
      );
    }

    if (state.queue.length === 0) {
      const fallback = seedCandidates(stationId).find(
        (t) => t.refId !== state.lastFailedRefId && t.refId !== state.current?.refId,
      );
      if (fallback) {
        next = fallback;
        break;
      }
      state.status = "recovering";
      state.updatedAtMs = nowMs;
      radioWarn("advance_no_candidates", { stationId, reason, attempts });
      return state;
    }

    const candidate = state.queue.shift()!;
    if (
      candidate.refId === state.lastFailedRefId ||
      candidate.refId === state.current?.refId
    ) {
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

  await ensureQueue(state);

  radioLog("station_advanced", {
    stationId,
    reason,
    track: next.refId,
    queueSize: state.queue.length,
    version: state.version,
  });

  return state;
}

export async function reconcileStation(
  state: StationState | null,
  stationId: RadioStationId,
  nowMs: number,
): Promise<StationState> {
  if (!state) {
    return bootstrapStation(stationId, nowMs);
  }

  if (state.status === "unavailable" && !state.current) {
    return bootstrapStation(stationId, nowMs);
  }

  if (shouldAdvanceTrack(state, nowMs)) {
    return advanceStationState(state, "auto", nowMs);
  }

  if (state.queue.length < RADIO_ENGINE_CONFIG.lowWaterMark) {
    state.queue = await fillQueue(
      stationId,
      state.queue,
      state.history,
      state.current,
      RADIO_ENGINE_CONFIG.queueTarget,
    );
    state.updatedAtMs = nowMs;
  }

  return state;
}

export function toWire(state: StationState, nowMs: number): StationWire {
  return wireState(state, nowMs);
}

export function allStationIds(): RadioStationId[] {
  return [...RADIO_STATION_IDS];
}

export function enrichTrackFromSeed(
  stationId: RadioStationId,
  refId: string,
): StationTrack | null {
  const seeds = seedCandidates(stationId);
  return seeds.find((t) => t.refId === refId) ?? null;
}

export function getStationDefinition(stationId: RadioStationId) {
  return stationMeta(stationId);
}

/** Upgrade legacy seed-only track metadata when duration missing. */
export function mergeTrackMetadata(
  track: StationTrack,
  stationId: RadioStationId,
): StationTrack {
  if (track.durationMs > 0) return track;
  const seed = enrichTrackFromSeed(stationId, track.refId);
  if (seed?.durationMs) {
    return { ...track, durationMs: seed.durationMs, artwork: track.artwork ?? seed.artwork };
  }
  return track;
}

export function trackFromSeedIndex(stationId: RadioStationId, index: number): StationTrack | null {
  const seeds = seedCandidates(stationId);
  const entry = seeds[index];
  if (entry) return entry;
  const raw = getPlaylistForGenre(stationId)[index];
  return raw ? playlistEntryToStationTrack(raw) : null;
}
