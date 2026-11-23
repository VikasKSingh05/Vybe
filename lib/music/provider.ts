import type { Song } from "@/types/music";
import { jioSaavnProvider } from "./providers/jiosaavn";

/**
 * Provider boundary for all music lookups. Routes and discovery depend on
 * this interface, so swapping the upstream catalog later is a config change
 * rather than a rewrite of search, radio, and player code.
 */
export interface MusicProvider {
  readonly id: "jiosaavn";
  search(query: string, options?: { limit?: number }): Promise<Song[]>;
  resolve(songId?: string, fallbackQuery?: string): Promise<Song | null>;
}

export function getMusicProvider(): MusicProvider {
  return jioSaavnProvider;
}
