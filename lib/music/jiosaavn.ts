import { normalizeSong } from "./normalize";
import type { Song } from "@/types/music";
import type { JioSaavnApiResponse, JioSaavnRawSong } from "./types";

export async function fetchJioSaavnSong(songId?: string, fallbackQuery?: string): Promise<Song | null> {
  const baseUrl = process.env.JIOSAAVN_API_URL || "http://localhost:3000";
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

  const cleanId = songId?.trim();
  const isValidId = cleanId && cleanId !== "search" && cleanId !== "null" && cleanId !== "undefined";

  // 1. If valid song ID is provided, attempt resolving by ID first
  if (isValidId) {
    const endpoints = [
      `${cleanBaseUrl}/api/songs?ids=${encodeURIComponent(cleanId)}`,
      `${cleanBaseUrl}/api/songs/${encodeURIComponent(cleanId)}`,
      `${cleanBaseUrl}/api/songs?id=${encodeURIComponent(cleanId)}`,
      `${cleanBaseUrl}/songs/${encodeURIComponent(cleanId)}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          next: { revalidate: 3600 },
        });

        if (!res.ok) continue;

        const body: JioSaavnApiResponse | JioSaavnRawSong | { success?: boolean; data?: JioSaavnRawSong[] } = await res.json();
        
        let rawSong: JioSaavnRawSong | null = null;

        if ("data" in body && body.data) {
          if (Array.isArray(body.data)) {
            rawSong = body.data[0] || null;
          } else {
            rawSong = body.data as JioSaavnRawSong;
          }
        } else if ("results" in body && body.results && body.results.length > 0) {
          rawSong = body.results[0];
        } else if (Array.isArray(body) && body.length > 0) {
          rawSong = body[0];
        } else if (body && typeof body === "object" && ("id" in body || "name" in body || "title" in body)) {
          rawSong = body as JioSaavnRawSong;
        }

        if (rawSong) {
          const normalized = normalizeSong(rawSong, cleanId);
          if (normalized.streamUrl) {
            return normalized;
          }
        }
      } catch (err) {
        console.warn(`[JioSaavn API] Request failed for ${url}:`, err);
      }
    }
  }

  // 2. If song ID is missing or ID resolution failed, search JioSaavn using title + artist
  if (fallbackQuery && fallbackQuery.trim()) {
    try {
      const searchUrl = `${cleanBaseUrl}/api/search/songs?query=${encodeURIComponent(fallbackQuery.trim())}`;
      const res = await fetch(searchUrl, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data = await res.json();
        const results = data?.data?.results || data?.results || data?.songs || (Array.isArray(data?.data) ? data.data : []);
        if (results && results.length > 0) {
          const firstMatch = results[0];
          const normalized = normalizeSong(firstMatch);
          if (normalized.streamUrl) {
            return normalized;
          }
        }
      }
    } catch (searchErr) {
      console.warn(`[JioSaavn API] Search fallback failed for "${fallbackQuery}":`, searchErr);
    }
  }

  return null;
}
