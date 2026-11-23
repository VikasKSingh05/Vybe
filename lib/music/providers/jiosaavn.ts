import { normalizeSong } from "../normalize";
import { rankAndDedupeSongs } from "../ranking";
import type { MusicProvider } from "../provider";
import type { JioSaavnRawSong } from "../types";
import type { Song } from "@/types/music";

const FETCH_TIMEOUT_MS = 8_000;
const MIN_RESULTS_BEFORE_VARIANTS = 8;

function getBaseUrl(): string | null {
  const url = process.env.JIOSAAVN_API_URL?.trim();
  return url ? url.replace(/\/+$/, "") : null;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (error) {
    console.warn(`[JioSaavn] Request failed for ${url}:`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isRawSong(value: unknown): value is JioSaavnRawSong {
  return Boolean(
    value &&
      typeof value === "object" &&
      ("id" in value || "title" in value || "name" in value || "song" in value),
  );
}

function extractResults(data: unknown): JioSaavnRawSong[] {
  if (!data || typeof data !== "object") return [];
  const root = data as Record<string, unknown>;
  const dataValue = root.data;
  const candidates =
    (dataValue && typeof dataValue === "object" && "results" in dataValue
      ? (dataValue as Record<string, unknown>).results
      : undefined) ??
    root.results ??
    root.songs ??
    dataValue ??
    data;

  if (Array.isArray(candidates)) return candidates.filter(isRawSong);
  return isRawSong(candidates) ? [candidates] : [];
}

function extractSingle(data: unknown): JioSaavnRawSong | null {
  const results = extractResults(data);
  return results[0] ?? null;
}

function searchQueries(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const variants = [trimmed];
  // Only try extra phrasings when the first lookup is thin, and keep them
  // short so the upstream mirror is not hammered with pathological queries.
  if (trimmed.length <= 40) {
    variants.push(`${trimmed} official`, `${trimmed} audio`);
  }
  return [...new Set(variants)];
}

async function fetchSearchResults(query: string): Promise<JioSaavnRawSong[]> {
  const base = getBaseUrl();
  if (!base) return [];
  const encoded = encodeURIComponent(query.trim());
  const urls = [
    `${base}/api/search/songs?query=${encoded}`,
    `${base}/api/search?query=${encoded}&type=song`,
  ];

  for (const url of urls) {
    const data = await fetchJson(url, { cache: "no-store" });
    const results = extractResults(data);
    if (results.length > 0) return results;
  }
  return [];
}

async function resolveById(id: string): Promise<Song | null> {
  const base = getBaseUrl();
  if (!base) return null;
  const encoded = encodeURIComponent(id);
  const urls = [
    `${base}/api/songs?ids=${encoded}`,
    `${base}/api/songs/${encoded}`,
    `${base}/api/songs?id=${encoded}`,
    `${base}/songs/${encoded}`,
  ];

  for (const url of urls) {
    const data = await fetchJson(url, { next: { revalidate: 300 } });
    const raw = extractSingle(data);
    if (!raw) continue;
    const song = normalizeSong(raw, id);
    if (song.streamUrl) return song;
  }
  return null;
}

export const jioSaavnProvider: MusicProvider = {
  id: "jiosaavn",

  async search(query, options) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    const limit = Math.max(1, options?.limit ?? 20);
    const raw: JioSaavnRawSong[] = [];

    for (const variant of searchQueries(normalizedQuery)) {
      raw.push(...(await fetchSearchResults(variant)));
      const playable = rankAndDedupeSongs(
        raw.map((item) => normalizeSong(item)),
        normalizedQuery,
      ).filter((song) => song.streamUrl);
      if (playable.length >= Math.max(MIN_RESULTS_BEFORE_VARIANTS, limit)) break;
    }

    return rankAndDedupeSongs(raw.map((item) => normalizeSong(item)), normalizedQuery)
      .filter((song) => Boolean(song.streamUrl))
      .slice(0, limit);
  },

  async resolve(songId, fallbackQuery) {
    const cleanId = songId?.trim();
    const usableId =
      cleanId && cleanId !== "search" && cleanId !== "null" && cleanId !== "undefined"
        ? cleanId
        : null;

    if (usableId) {
      const byId = await resolveById(usableId);
      if (byId) return byId;
    }

    const query = fallbackQuery?.trim();
    if (!query) return null;

    const raw: JioSaavnRawSong[] = [];
    for (const variant of searchQueries(query).slice(0, 2)) {
      raw.push(...(await fetchSearchResults(variant)));
      if (raw.length >= MIN_RESULTS_BEFORE_VARIANTS) break;
    }

    const ranked = rankAndDedupeSongs(
      raw.map((item) => normalizeSong(item)),
      query,
    );

    // Prefer the most relevant result that is already playable, then try to
    // resolve the top candidates by id. Never blindly take results[0].
    for (const song of ranked.slice(0, 6)) {
      if (song.streamUrl) return song;
    }
    for (const song of ranked.slice(0, 3)) {
      const resolved = await resolveById(song.id);
      if (resolved) return resolved;
    }
    return null;
  },
};

/** Compatibility wrapper used by existing discovery and radio call sites. */
export function searchJioSaavnSongs(query: string): Promise<Song[]> {
  return jioSaavnProvider.search(query);
}

/** Compatibility wrapper used by the song-resolution route. */
export function fetchJioSaavnSong(songId?: string, fallbackQuery?: string): Promise<Song | null> {
  return jioSaavnProvider.resolve(songId, fallbackQuery);
}
