export type VibeId =
  | "all"
  | "phonk"
  | "lofi"
  | "bollywood"
  | "indie"
  | "chill";

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  cover: string;
  audio?: string;
  accent: string;
  synthPreset?: "sitar" | "phonk" | "lofi" | "bollywood" | "indie" | "chill";
}

export interface VibeTheme {
  id: VibeId;
  label: string;
  background: string;
  overlay: string;
  accent: string;
  description: string;
  tracks: Track[];
}

export interface GenreInfo {
  id: VibeId;
  label: string;
  description: string;
}
