import type { PlaylistEntry } from "@/data/playlists";
import type { Song } from "@/types/music";

type SongCache = Map<string, Song>;

function getCacheKey(entry: PlaylistEntry): string {
  const id = entry.jiosaavnId?.trim();
  return id || `${entry.title}-${entry.artist}`.toLowerCase();
}

export async function resolveSong(
  cache: SongCache,
  entry: PlaylistEntry,
): Promise<Song | null> {
  const cacheKey = getCacheKey(entry);
  const cached = cache.get(cacheKey);
  if (cached?.streamUrl) return cached;

  try {
    const queryParam = encodeURIComponent(`${entry.title} ${entry.artist}`);
    const idParam = entry.jiosaavnId?.trim() || "search";
    const res = await fetch(`/api/music/song/${idParam}?query=${queryParam}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: Song | null = await res.json().catch(() => null);
    if (data?.streamUrl) {
      cache.set(cacheKey, data);
      return data;
    }
  } catch {
    // resolution failed; caller handles null return
  }

  return null;
}
