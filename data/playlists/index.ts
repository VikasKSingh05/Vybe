import type { VibeId } from "@/data/types";
import type { PlaylistEntry } from "./types";
import { phonkPlaylist } from "./phonk";
import { lofiPlaylist } from "./lofi";
import { bollywoodPlaylist } from "./bollywood";
import { indiePlaylist } from "./indie";
import { chillPlaylist } from "./chill";

export * from "./types";
export * from "./phonk";
export * from "./lofi";
export * from "./bollywood";
export * from "./indie";
export * from "./chill";

export const allPlaylist: PlaylistEntry[] = [
  ...phonkPlaylist,
  ...lofiPlaylist,
  ...bollywoodPlaylist,
  ...indiePlaylist,
  ...chillPlaylist,
];

export const playlistsByGenre: Record<VibeId, PlaylistEntry[]> = {
  all: allPlaylist,
  phonk: phonkPlaylist,
  lofi: lofiPlaylist,
  bollywood: bollywoodPlaylist,
  indie: indiePlaylist,
  chill: chillPlaylist,
};

export function getPlaylistForGenre(genre: VibeId): PlaylistEntry[] {
  return playlistsByGenre[genre] ?? playlistsByGenre.all;
}
