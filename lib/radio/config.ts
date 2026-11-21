import type { RadioStationId } from "./types";

export const RADIO_STATION_IDS: RadioStationId[] = [
  "phonk",
  "lofi",
  "bollywood",
  "indie",
  "chill",
];

export interface StationDefinition {
  id: RadioStationId;
  name: string;
  description: string;
  searchQueries: string[];
}

export const STATION_DEFINITIONS: Record<RadioStationId, StationDefinition> = {
  phonk: {
    id: "phonk",
    name: "PHONK RADIO",
    description: "Aggressive phonk, drift phonk, and underground energy.",
    searchQueries: ["phonk music", "drift phonk", "phonk beats", "memphis rap", "brazil phonk"],
  },
  lofi: {
    id: "lofi",
    name: "LO-FI RADIO",
    description: "Lo-fi hip-hop, instrumental beats, and quiet study hours.",
    searchQueries: ["lofi beats", "lofi hip hop", "chill lofi", "study lofi", "lofi hindi"],
  },
  bollywood: {
    id: "bollywood",
    name: "BOLLYWOOD RADIO",
    description: "Bollywood hits across moods, decades, and late-night drives.",
    searchQueries: [
      "bollywood hits",
      "romantic bollywood",
      "bollywood party songs",
      "90s bollywood hits",
      "hindi sad songs",
    ],
  },
  indie: {
    id: "indie",
    name: "INDIE RADIO",
    description: "Indie, alternative, and acoustic discovery.",
    searchQueries: ["indie hindi songs", "indie pop", "indie rock", "acoustic hindi", "indie english"],
  },
  chill: {
    id: "chill",
    name: "CHILL RADIO",
    description: "Ambient, mellow, and relaxing tracks.",
    searchQueries: ["chill english songs", "chill vibes", "relaxing music", "chill acoustic", "ambient chill"],
  },
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
} as const;

export function isRadioStationId(value: string): value is RadioStationId {
  return (RADIO_STATION_IDS as string[]).includes(value);
}
