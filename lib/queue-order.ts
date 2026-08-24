import type { PlaylistEntry } from "@/data/playlists";

export interface ReorderResult {
  list: PlaylistEntry[];
  currentIndex: number;
}

/**
 * Moves an entry from `from` to `to` and keeps `currentIndex` anchored to the
 * same song. Returns null for no-ops / out-of-bounds so callers can bail.
 */
export function applyReorder(
  list: PlaylistEntry[],
  from: number,
  to: number,
  currentIndex: number,
): ReorderResult | null {
  if (from === to) return null;
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return null;

  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);

  let nextIndex = currentIndex;
  if (currentIndex === from) {
    nextIndex = to;
  } else if (from < currentIndex && to >= currentIndex) {
    nextIndex = currentIndex - 1;
  } else if (from > currentIndex && to <= currentIndex) {
    nextIndex = currentIndex + 1;
  }

  return { list: next, currentIndex: nextIndex };
}

/** Inserts an entry right after the current track (end of list if empty). */
export function insertAfterCurrent(
  list: PlaylistEntry[],
  currentIndex: number,
  entry: PlaylistEntry,
): PlaylistEntry[] {
  const insertAt = Math.min(Math.max(currentIndex, -1) + 1, list.length);
  return [...list.slice(0, insertAt), entry, ...list.slice(insertAt)];
}
