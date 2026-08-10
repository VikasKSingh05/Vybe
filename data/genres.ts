import type { GenreInfo, VibeId } from "./types";

export const genres: GenreInfo[] = [
  {
    id: "all",
    label: "ALL",
    description: "Curated mix across all cinematic vibes",
  },
  {
    id: "phonk",
    label: "PHONK",
    description: "Dark drift phonk, heavy sub bass, and brutalist atmosphere",
  },
  {
    id: "lofi",
    label: "LO-FI",
    description: "Cozy vinyl crackles, rainy beats, and late-night warmth",
  },
  {
    id: "bollywood",
    label: "BOLLYWOOD",
    description: "Nostalgic retro melodies and Indian cinema soul",
  },
  {
    id: "indie",
    label: "INDIE",
    description: "Golden hour road trip tunes, acoustic warmth, and dream pop",
  },
  {
    id: "chill",
    label: "CHILL",
    description: "Deep blue hour ambient, soothing synth pads, and ocean tides",
  },
];

export function getGenreById(id: VibeId): GenreInfo {
  return genres.find((g) => g.id === id) ?? genres[0];
}
