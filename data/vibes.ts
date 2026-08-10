import { backgroundThemes } from "./backgrounds";
import { songsByGenre, allSongs } from "./songs";
import type { Track, VibeId, VibeTheme } from "./types";

export const vibeThemes: VibeTheme[] = [
  {
    ...backgroundThemes.all,
    tracks: allSongs,
  },
  {
    ...backgroundThemes.phonk,
    tracks: songsByGenre.phonk,
  },
  {
    ...backgroundThemes.lofi,
    tracks: songsByGenre.lofi,
  },
  {
    ...backgroundThemes.bollywood,
    tracks: songsByGenre.bollywood,
  },
  {
    ...backgroundThemes.indie,
    tracks: songsByGenre.indie,
  },
  {
    ...backgroundThemes.chill,
    tracks: songsByGenre.chill,
  },
];

export function getVibeTheme(id: VibeId): VibeTheme {
  return vibeThemes.find((v) => v.id === id) ?? vibeThemes[0];
}

export function getAllTracks(): Track[] {
  return vibeThemes.flatMap((v) => v.tracks);
}

export function findTrackById(id: string): Track | undefined {
  return getAllTracks().find((t) => t.id === id);
}

export function getNextTrack(
  currentId: string,
  vibeId: VibeId,
): Track | undefined {
  const theme = getVibeTheme(vibeId);
  const index = theme.tracks.findIndex((t) => t.id === currentId);
  if (index === -1) return theme.tracks[0];
  return theme.tracks[(index + 1) % theme.tracks.length];
}

export function getPrevTrack(
  currentId: string,
  vibeId: VibeId,
): Track | undefined {
  const theme = getVibeTheme(vibeId);
  const index = theme.tracks.findIndex((t) => t.id === currentId);
  if (index === -1) return theme.tracks[0];
  return theme.tracks[(index - 1 + theme.tracks.length) % theme.tracks.length];
}
