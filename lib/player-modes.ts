import type { PlaylistEntry } from "@/data/playlists";

export type RepeatMode = "off" | "one" | "all";

export interface PlayerModes {
  repeatMode: RepeatMode;
  shuffle: boolean;
}

export function isRepeatMode(value: unknown): value is RepeatMode {
  return value === "off" || value === "one" || value === "all";
}

/**
 * Resolves the index to play after the current track "ends" naturally
 * (auto-advance). Repeat-one re-plays the same index; otherwise it defers to
 * the shared nextIndex logic. Returns the same index for repeat-one, null when
 * playback should stop (repeat-off at the last track).
 */
export function advanceOnEnded(
  currentIndex: number,
  length: number,
  mode: RepeatMode,
): number | null {
  if (length === 0) return null;
  if (mode === "one") return currentIndex;
  const next = nextIndex(currentIndex, length, mode);
  if (next === null) return null;
  return next;
}

/**
 * The plain "next" index. Repeat-off stops (returns null) at the last track;
 * repeat-all wraps. Shuffle is intentionally not handled here — the UI uses
 * this when repeating ends or via manual next, so shuffle stays a visual
 * reorder of the list rather than random jumps.
 */
export function nextIndex(
  currentIndex: number,
  length: number,
  mode: RepeatMode,
): number | null {
  if (length === 0) return null;
  if (mode === "off" && currentIndex >= length - 1) return null;
  return (currentIndex + 1) % length;
}

/**
 * The plain "prev" index. Repeat-off stops (returns null) at the first track;
 * repeat-all wraps.
 */
export function prevIndex(
  currentIndex: number,
  length: number,
  mode: RepeatMode,
): number | null {
  if (length === 0) return null;
  if (mode === "off" && currentIndex <= 0) return null;
  return (currentIndex - 1 + length) % length;
}

/**
 * Fisher-Yates shuffle of the playlist that keeps the currently playing song
 * anchored at its current index. Returns null when the list is too small to
 * shuffle. Because entries are unique objects, we can locate the current song
 * by identity after shuffling.
 */
export function shuffleList(
  list: PlaylistEntry[],
  currentIndex: number,
): PlaylistEntry[] | null {
  if (list.length < 2) return null;
  const current = list[currentIndex];
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  const anchored = result.indexOf(current);
  if (anchored !== -1 && anchored !== currentIndex) {
    [result[anchored], result[currentIndex]] = [result[currentIndex], result[anchored]];
  }
  return result;
}

