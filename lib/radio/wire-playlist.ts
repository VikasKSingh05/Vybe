import type { PlaylistEntry } from "@/data/playlists";
import type { StationTrack, StationWire } from "./types";

function trackToEntry(track: StationTrack): PlaylistEntry {
  return {
    jiosaavnId: track.trackId,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    duration: track.durationMs > 0 ? track.durationMs / 1000 : undefined,
  };
}

export function wireToPlaylist(wire: StationWire): PlaylistEntry[] {
  const list: PlaylistEntry[] = [];
  if (wire.current) list.push(trackToEntry(wire.current));
  for (const upcoming of wire.queue) {
    list.push(trackToEntry(upcoming));
  }
  return list;
}
