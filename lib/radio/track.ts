import type { PlaylistEntry } from "@/data/playlists";
import type { Song } from "@/types/music";
import { normalizeDurationMs } from "./duration";
import type { StationTrack } from "./types";

export function trackRefId(provider: "jiosaavn", trackId: string): string {
  return `${provider}:${trackId}`;
}

export function parseRefId(refId: string): { provider: "jiosaavn"; trackId: string } | null {
  const [provider, trackId] = refId.split(":");
  if (provider === "jiosaavn" && trackId?.trim()) {
    return { provider: "jiosaavn", trackId: trackId.trim() };
  }
  return null;
}

export function songToStationTrack(song: Song): StationTrack | null {
  if (!song.id?.trim() || !song.title?.trim()) return null;
  const durationMs = normalizeDurationMs(song.duration);
  return {
    refId: trackRefId("jiosaavn", song.id.trim()),
    provider: "jiosaavn",
    trackId: song.id.trim(),
    title: song.title.trim(),
    artist: (song.artist || "Unknown").trim(),
    artwork: song.artwork,
    durationMs,
  };
}

export function playlistEntryToStationTrack(entry: PlaylistEntry): StationTrack | null {
  const id = entry.jiosaavnId?.trim();
  if (!id || !entry.title?.trim()) return null;
  return {
    refId: trackRefId("jiosaavn", id),
    provider: "jiosaavn",
    trackId: id,
    title: entry.title.trim(),
    artist: (entry.artist || "Unknown").trim(),
    artwork: entry.artwork,
    durationMs: normalizeDurationMs(entry.duration),
  };
}

export function normalizeTitleArtistKey(title: string, artist: string): string {
  return `${title}-${artist}`.toLowerCase().replace(/\s+/g, " ").trim();
}
