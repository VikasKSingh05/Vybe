import { backgroundThemes } from "./backgrounds";
import type { VibeId, VibeTheme } from "./types";

export const vibeThemes: VibeTheme[] = [
  backgroundThemes.all,
  backgroundThemes.phonk,
  backgroundThemes.lofi,
  backgroundThemes.bollywood,
  backgroundThemes.indie,
  backgroundThemes.chill,
];

export function getVibeTheme(id: VibeId): VibeTheme {
  return vibeThemes.find((v) => v.id === id) ?? vibeThemes[0];
}
