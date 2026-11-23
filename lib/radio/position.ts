import { RADIO_ENGINE_CONFIG } from "./config";
import type { StationState } from "./types";

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

export function wireState(state: StationState, nowMs: number) {
  return {
    ...state,
    serverNowMs: nowMs,
    expectedPositionMs: expectedPositionMs(state, nowMs),
  };
}
