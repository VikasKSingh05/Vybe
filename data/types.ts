export type VibeId =
  | "all"
  | "phonk"
  | "lofi"
  | "bollywood"
  | "indie"
  | "chill"
  | "random";

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  cover?: string;
  streamUrl?: string;
  accent: string;
}

export interface QueueItem {
  queueItemId: string;
  title: string;
  artist: string;
  jiosaavnId?: string;
  artwork?: string;
  duration?: number;
  mood?: string;
  energy?: number;
}

export interface VibeTheme {
  id: VibeId;
  label: string;
  background: string;
  overlay: string;
  accent: string;
  description: string;
}
