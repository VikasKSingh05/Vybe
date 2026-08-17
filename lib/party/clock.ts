import type { PartyPlayback, PartyState } from "./types";

/**
 * Computes the effective playhead position (seconds) of the conductor clock.
 * Uses an optional clock offset so clients can correct for network latency
 * between the server's wall clock and their own.
 */
export function effectivePosition(
  playback: PartyPlayback | null,
  now = Date.now(),
): number {
  if (!playback || !playback.queueId) return 0;
  if (playback.paused && playback.pausedAt != null) {
    return (playback.pausedAt - playback.startedAt) / 1000 + playback.positionAtStart;
  }
  return (now - playback.startedAt) / 1000 + playback.positionAtStart;
}

/**
 * Serialization guard against NaN / negative playhead values.
 */
export function clampPosition(position: number, duration = 0): number {
  if (!Number.isFinite(position)) return 0;
  if (duration > 0) return Math.min(Math.max(position, 0), duration);
  return Math.max(position, 0);
}

/** Stable signature of a playback segment; used to detect transitions. */
export function playbackSignature(pb: PartyPlayback | null): string {
  if (!pb) return "";
  return `${pb.queueId}|${pb.startedAt}|${pb.positionAtStart}|${pb.paused}|${pb.pausedAt}`;
}

/** Serializes a state for wire transfer, filling in the server clock. */
export function toWireState(state: Omit<PartyState, "serverNow">, now = Date.now()): PartyState {
  return { ...state, serverNow: now, reactions: state.reactions.slice(-20) };
}
