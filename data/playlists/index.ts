import type { VibeId } from "@/data/types";
import type { PlaylistEntry } from "./types";
import { phonkPlaylist } from "./phonk";
import { loFiPlaylist } from "./lofi";
import { bollywoodPlaylist } from "./bollywood";
import { indiePlaylist } from "./indie";
import { chillPlaylist } from "./chill";

export * from "./types";
export * from "./phonk";
export * from "./lofi";
export * from "./bollywood";
export * from "./indie";
export * from "./chill";

export const playlistsByGenre: Record<VibeId, PlaylistEntry[]> = {
  phonk: phonkPlaylist,
  lofi: loFiPlaylist,
  bollywood: bollywoodPlaylist,
  indie: indiePlaylist,
  chill: chillPlaylist,
  random: [],
};

export function getPlaylistForGenre(genre: VibeId): PlaylistEntry[] {
  return playlistsByGenre[genre] ?? playlistsByGenre.phonk;
}
