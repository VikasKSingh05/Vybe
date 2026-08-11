export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration?: number;
  streamUrl?: string;
  provider: "jiosaavn";
}
