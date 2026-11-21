import type { VibeId } from "@/data/types";

/** Shared logical radio stations (excludes personal "random" mode). */
export type RadioStationId = Exclude<VibeId, "random">;

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
  /** Last track ref that failed playback (cooldown). */
  lastFailedRefId?: string;
}

export interface StationSummary {
  stationId: RadioStationId;
  name: string;
  description: string;
  status: StationHealth;
  version: number;
  current: Pick<StationTrack, "title" | "artist" | "artwork" | "refId" | "trackId"> | null;
  expectedPositionMs: number;
  durationMs: number;
  nextUp: Pick<StationTrack, "title" | "artist"> | null;
}

export interface StationWire extends StationState {
  serverNowMs: number;
  expectedPositionMs: number;
}

export type AdvanceReason = "auto" | "skip" | "complete" | "recovery";
