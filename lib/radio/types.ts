/** VYBE has exactly one shared broadcast with one fixed visual identity. */
export type RadioStationId = "live";

export type StationHealth = "live" | "loading" | "recovering" | "unavailable";

export interface StationTrack {
  /** Provider-qualified stable id, e.g. `jiosaavn:abc123`. */
  refId: string;
  provider: "jiosaavn";
  trackId: string;
  title: string;
  artist: string;
  artwork?: string;
  /** Duration in milliseconds; 0 when unknown until resolved. */
  durationMs: number;
}

/** A recent playback failure, kept for the cooldown window. */
export interface FailedTrack {
  refId: string;
  failedAtMs: number;
}

export interface StationState {
  stationId: RadioStationId;
  version: number;
  status: StationHealth;
  current: StationTrack | null;
  /** UTC epoch ms when the current track broadcast started. */
  startedAtMs: number;
  queue: StationTrack[];
  /** Recent refIds (newest last), bounded. */
  history: string[];
  updatedAtMs: number;
  /** Tracks that failed recently and should not be retried immediately. */
  failedTracks: FailedTrack[];
}

export interface StationWire extends StationState {
  serverNowMs: number;
  expectedPositionMs: number;
}

export type AdvanceReason = "auto" | "skip" | "complete" | "recovery";
