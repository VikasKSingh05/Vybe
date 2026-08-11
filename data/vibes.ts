import { backgroundThemes } from "./backgrounds";
import type { VibeId, VibeTheme } from "./types";

export const vibeThemes: VibeTheme[] = [
  {
    ...backgroundThemes.all,
    tracks: [],
  },
  {
    ...backgroundThemes.phonk,
    tracks: [],
  },
  {
    ...backgroundThemes.lofi,
    tracks: [],
  },
  {
    ...backgroundThemes.bollywood,
    tracks: [],
  },
  {
    ...backgroundThemes.indie,
    tracks: [],
  },
  {
    ...backgroundThemes.chill,
    tracks: [],
  },
];

export function getVibeTheme(id: VibeId): VibeTheme {
  return vibeThemes.find((v) => v.id === id) ?? vibeThemes[0];
}
