import type { VibeId } from "@/data/types";
import type { PlaylistEntry } from "@/data/playlists";
import { isRepeatMode, type RepeatMode } from "@/lib/player-modes";

const STORAGE_KEY = "vybe.player.v1";
const MAX_PERSISTED_ENTRIES = 200;
const DEFAULT_CROSSFADE_MS = 3000;
const MAX_CROSSFADE_MS = 8000;
const MIN_CROSSFADE_MS = 0;

export interface PersistedPlayerState {
  vibeId: VibeId;
  playlist: PlaylistEntry[];
  currentIndex: number;
  volume: number;
  isMuted: boolean;
  crossfadeEnabled: boolean;
  crossfadeMs: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
}

function isVibeId(value: unknown): value is VibeId {
  return (
    value === "phonk" ||
    value === "lofi" ||
    value === "bollywood" ||
    value === "indie" ||
    value === "chill" ||
    value === "random"
  );
}

function isValidEntry(value: unknown): value is PlaylistEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.title === "string" && typeof entry.artist === "string";
}

export function loadPlayerState(): PersistedPlayerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || !isVibeId(parsed.vibeId)) return null;
    if (!Array.isArray(parsed.playlist) || parsed.playlist.length === 0) return null;
    const playlist = parsed.playlist.filter(isValidEntry).slice(0, MAX_PERSISTED_ENTRIES);
    if (playlist.length === 0) return null;

    const maxIndex = playlist.length - 1;
    const currentIndex =
      typeof parsed.currentIndex === "number" && Number.isFinite(parsed.currentIndex)
        ? Math.min(maxIndex, Math.max(0, Math.trunc(parsed.currentIndex)))
        : 0;
    const volume =
      typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
        ? Math.min(1, Math.max(0, parsed.volume))
        : 0.75;

    const crossfadeMs =
      typeof parsed.crossfadeMs === "number" && Number.isFinite(parsed.crossfadeMs)
        ? Math.min(MAX_CROSSFADE_MS, Math.max(MIN_CROSSFADE_MS, parsed.crossfadeMs))
        : DEFAULT_CROSSFADE_MS;

    return {
      vibeId: parsed.vibeId,
      playlist,
      currentIndex,
      volume,
      isMuted: parsed.isMuted === true,
      crossfadeEnabled: parsed.crossfadeEnabled !== false,
      crossfadeMs,
      repeatMode: isRepeatMode(parsed.repeatMode) ? parsed.repeatMode : "all",
      shuffle: parsed.shuffle === true,
    };
  } catch {
    // Corrupted or unavailable storage — start fresh
    return null;
  }
}

export function savePlayerState(state: PersistedPlayerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        playlist: state.playlist.slice(0, MAX_PERSISTED_ENTRIES),
      }),
    );
  } catch {
    // Quota exceeded / private mode — persistence is best-effort
  }
}
