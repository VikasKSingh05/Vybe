import type { Song } from "@/types/music";
import type { JioSaavnRawSong, JioSaavnDownloadUrl, JioSaavnImage } from "./types";

/**
 * Priority order for audio bitrates.
 */
const QUALITY_PRIORITY = ["320kbps", "320", "160kbps", "160", "96kbps", "96", "48kbps", "48", "12kbps", "12"];

export function extractBestStreamUrl(downloadUrl?: JioSaavnDownloadUrl[]): string | undefined {
  if (!downloadUrl || !Array.isArray(downloadUrl) || downloadUrl.length === 0) {
    return undefined;
  }

  // 1. Try matching explicit priority order: 320kbps -> 160kbps -> 96kbps -> 48kbps -> 12kbps
  for (const targetQuality of QUALITY_PRIORITY) {
    const item = downloadUrl.find((d) => {
      const q = String(d.quality || "").toLowerCase().trim();
      return q === targetQuality || q.replace(/[^0-9]/g, "") === targetQuality.replace(/[^0-9]/g, "");
    });
    const stream = item?.url || item?.link;
    if (stream && isValidStreamUrl(stream)) {
      return stream;
    }
  }

  // 2. Fallback: Parse numeric bitrates and sort highest quality first
  const validStreams = downloadUrl
    .map((d) => {
      const url = d.url || d.link;
      const numericQuality = parseInt(String(d.quality || "").replace(/[^0-9]/g, ""), 10) || 0;
      return { url, quality: numericQuality };
    })
    .filter((d): d is { url: string; quality: number } => Boolean(d.url && isValidStreamUrl(d.url)));

  if (validStreams.length > 0) {
    validStreams.sort((a, b) => b.quality - a.quality);
    return validStreams[0].url;
  }

  return undefined;
}

function isValidStreamUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  // Ensure it's not a saavn webpage link
  if (url.includes("jiosaavn.com/song/") || url.includes("saavn.com/s/song/")) {
    return false;
  }
  return true;
}

export function extractArtworkUrl(image?: string | JioSaavnImage[]): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;

  if (Array.isArray(image) && image.length > 0) {
    // Prefer highest resolution (usually last in array or 500x500)
    const preferred =
      image.find((img) => img.quality === "500x500") ||
      image[image.length - 1] ||
      image[0];
    return preferred.url || preferred.link;
  }

  return undefined;
}

function extractArtistName(raw: Record<string, unknown>): string {
  if (typeof raw.primaryArtists === "string" && raw.primaryArtists.trim()) return raw.primaryArtists;
  if (typeof raw.singers === "string" && raw.singers.trim()) return raw.singers;
  if (typeof raw.artist === "string" && raw.artist.trim()) return raw.artist;

  const artists = raw.artists as Record<string, unknown> | undefined;
  if (artists && typeof artists === "object") {
    if (Array.isArray(artists.primary) && artists.primary.length > 0) {
      const names = artists.primary.map((a: Record<string, unknown>) => a.name).filter(Boolean);
      if (names.length) return names.join(", ");
    }
    if (Array.isArray(artists.all) && artists.all.length > 0) {
      const names = artists.all.map((a: Record<string, unknown>) => a.name).filter(Boolean);
      if (names.length) return names.join(", ");
    }
  }

  return "Unknown Artist";
}

export function normalizeSong(raw: JioSaavnRawSong, fallbackId?: string): Song {
  const id = raw.id || fallbackId || "unknown";
  const title = raw.title || raw.name || raw.song || "Unknown Track";
  const artist = extractArtistName(raw as Record<string, unknown>);
  
  let albumName: string | undefined;
  if (typeof raw.album === "string") {
    albumName = raw.album;
  } else if (raw.album && typeof raw.album === "object") {
    albumName = (raw.album as Record<string, unknown>).name as string;
  }

  const artwork = extractArtworkUrl(raw.image) ?? raw.artwork;
  let streamUrl = extractBestStreamUrl(raw.downloadUrl);

  // Fallback to media_url if downloadUrl didn't yield a stream
  if (!streamUrl && raw.media_url && isValidStreamUrl(raw.media_url)) {
    streamUrl = raw.media_url;
  }

  let duration: number | undefined;
  if (typeof raw.duration === "number") {
    duration = raw.duration;
  } else if (typeof raw.duration === "string") {
    const parsed = parseInt(raw.duration, 10);
    if (!isNaN(parsed)) duration = parsed;
  }

  return {
    id,
    title,
    artist,
    album: albumName,
    artwork,
    duration,
    streamUrl,
    provider: "jiosaavn",
  };
}
