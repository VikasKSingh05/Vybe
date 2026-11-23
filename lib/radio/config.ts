import type { RadioStationId } from "./types";

/** The single shared broadcast id. Kept in the wire for forward compatibility. */
export const RADIO_STATION_ID: RadioStationId = "live";

export interface StationDefinition {
  id: RadioStationId;
  name: string;
  description: string;
}

export const RADIO_STATION_DEFINITION: StationDefinition = {
  id: RADIO_STATION_ID,
  name: "VYBE LIVE",
  description: "One global station, shared by everyone in real time.",
};

export const RADIO_ENGINE_CONFIG = {
  queueTarget: 8,
  lowWaterMark: 3,
  historyMax: 48,
  recentAvoidWindow: 28,
  maxSameArtistInRow: 1,
  advanceGraceMs: 800,
  maxAdvanceAttempts: 6,
  discoveryBatchSize: 10,
  maintenanceIntervalMs: 15_000,
  pollHintMs: 4_000,
  failedTrackCooldownMs: 10 * 60_000,
  failedTrackHistoryMax: 32,
} as const;

export function getStationDefinition(): StationDefinition {
  return RADIO_STATION_DEFINITION;
}
