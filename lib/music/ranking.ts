import type { Song } from "@/types/music";

export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return normalizeForMatch(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

/**
 * Lightweight relevance score for upstream results. Exact/prefix title matches
 * win, then token overlap in the title, then artist overlap. The unofficial
 * JioSaavn mirror has no relevance metadata, so this keeps the best match at
 * the top instead of blindly trusting result order.
 */
export function relevanceScore(song: Song, query: string): number {
  const q = normalizeForMatch(query);
  if (!q) return 0;

  const title = normalizeForMatch(song.title);
  const queryTokens = tokenize(q);
  const titleTokens = tokenize(song.title);
  const artistTokens = tokenize(song.artist);

  let score = 0;
  if (title === q) score += 120;
  else if (title.startsWith(q)) score += 80;
  else if (title.includes(q)) score += 55;

  for (const token of queryTokens) {
    if (titleTokens.includes(token)) score += 14;
    else if (titleTokens.some((t) => t.startsWith(token))) score += 8;
    if (artistTokens.includes(token)) score += 8;
    else if (artistTokens.some((t) => t.startsWith(token))) score += 4;
  }

  // Prefer playable, well-labelled results when scores are otherwise equal.
  if (song.streamUrl) score += 6;
  if (song.duration && song.duration > 0) score += 2;
  return score;
}

function trackKey(song: Song): string {
  return `${normalizeForMatch(song.title)}|${normalizeForMatch(song.artist)}`;
}

/**
 * Deduplicates by provider id and normalized title/artist, then orders by
 * playability and relevance. Unplayable rows are kept (ranked last) so callers
 * such as `resolve` can still use their ids to find a working stream.
 */
export function rankAndDedupeSongs(songs: Song[], query: string): Song[] {
  const seenIds = new Set<string>();
  const seenTracks = new Set<string>();
  const ranked: Array<{ song: Song; score: number }> = [];

  for (const song of songs) {
    if (!song?.title?.trim()) continue;
    const idKey = song.id.trim().toLowerCase();
    const key = trackKey(song);
    if ((idKey && seenIds.has(idKey)) || seenTracks.has(key)) continue;
    if (idKey) seenIds.add(idKey);
    seenTracks.add(key);
    ranked.push({ song, score: relevanceScore(song, query) });
  }

  ranked.sort((a, b) => {
    const playable = Number(Boolean(b.song.streamUrl)) - Number(Boolean(a.song.streamUrl));
    if (playable !== 0) return playable;
    if (b.score !== a.score) return b.score - a.score;
    return a.song.title.localeCompare(b.song.title);
  });

  return ranked.map((entry) => entry.song);
}
