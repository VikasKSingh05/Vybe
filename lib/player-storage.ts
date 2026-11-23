import { isRepeatMode, type RepeatMode } from "@/lib/player-modes";

const STORAGE_KEY = "vybe.player.v1";

/**
 * Only mixer settings are persisted. The queue always comes from the single
 * shared broadcast, so persisting tracks would be both stale and misleading.
 * Older payloads containing `vibeId`, `playlist`, or `currentIndex` are read
 * tolerantly and those legacy fields are ignored.
 */
export interface PersistedPlayerState {
  volume: number;
  isMuted: boolean;
  crossfadeEnabled: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
}

export function loadPlayerState(): PersistedPlayerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const volume =
      typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
        ? Math.min(1, Math.max(0, parsed.volume))
        : 0.75;

    return {
      volume,
      isMuted: parsed.isMuted === true,
      crossfadeEnabled: parsed.crossfadeEnabled !== false,
      repeatMode: isRepeatMode(parsed.repeatMode) ? parsed.repeatMode : "all",
      shuffle: parsed.shuffle === true,
    };
  } catch {
    // Corrupted or unavailable storage — start with defaults.
    return null;
  }
}

export function savePlayerState(state: PersistedPlayerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded / private mode — persistence is best-effort.
  }
}
