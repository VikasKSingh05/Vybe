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
  duration: number;
  cover: string;
  audio?: string;
  accent: string;
}

export interface VibeTheme {
  id: VibeId;
  label: string;
  background: string;
  overlay: string;
  accent: string;
  tracks: Track[];
}
