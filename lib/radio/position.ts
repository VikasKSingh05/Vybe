import { RADIO_ENGINE_CONFIG } from "./config";
import type { StationState, StationSummary, StationTrack } from "./types";

export function expectedPositionMs(
  state: Pick<StationState, "startedAtMs" | "current">,
  nowMs: number,
): number {
  if (!state.current) return 0;
  const elapsed = Math.max(0, nowMs - state.startedAtMs);
  const duration = state.current.durationMs;
  if (duration <= 0) return elapsed;
  return Math.min(duration, elapsed);
}

export function shouldAdvanceTrack(
  state: Pick<StationState, "startedAtMs" | "current">,
  nowMs: number,
): boolean {
  if (!state.current) return true;
  const duration = state.current.durationMs;
  if (duration <= 0) return false;
  const elapsed = nowMs - state.startedAtMs;
  return elapsed >= duration - RADIO_ENGINE_CONFIG.advanceGraceMs;
}

export function toSummary(
  state: StationState,
  meta: { name: string; description: string },
  nowMs: number,
): StationSummary {
  const durationMs = state.current?.durationMs ?? 0;
  return {
    stationId: state.stationId,
    name: meta.name,
    description: meta.description,
    status: state.status,
    version: state.version,
    current: state.current
      ? {
          refId: state.current.refId,
          trackId: state.current.trackId,
          title: state.current.title,
          artist: state.current.artist,
          artwork: state.current.artwork,
        }
      : null,
    expectedPositionMs: expectedPositionMs(state, nowMs),
    durationMs,
    nextUp: state.queue[0]
      ? { title: state.queue[0].title, artist: state.queue[0].artist }
      : null,
  };
}

export function wireState(state: StationState, nowMs: number) {
  return {
    ...state,
    serverNowMs: nowMs,
    expectedPositionMs: expectedPositionMs(state, nowMs),
  };
}

export function sameBroadcast(
  a: StationTrack | null,
  b: StationTrack | null,
  aStarted: number,
  bStarted: number,
): boolean {
  if (!a || !b) return false;
  return a.refId === b.refId && aStarted === bStarted;
}
