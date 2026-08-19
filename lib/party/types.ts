import type { Song } from "@/types/music";
import type { VibeId as _VibeId } from "@/data/types";
export type VibeId = _VibeId;

export interface PartyMember {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  lastSeen: number;
}

export interface PartyTrack {
  queueId: string;
  song: Song;
  addedBy: string;
  addedByName: string;
}

export interface PartyReaction {
  id: string;
  memberId: string;
  memberName: string;
  emoji: string;
  at: number;
}

/**
 * Conductor clock model. The server is the conductor: playback position is
 * derived from wall-clock time rather than a continuously streamed playhead,
 * which keeps all clients (host and guests) in sync with minimal traffic.
 */
export interface PartyPlayback {
  /** queueId of the track currently playing, or null when idle. */
  queueId: string | null;
  /** Server epoch ms when the current segment of playback began. */
  startedAt: number;
  /** Playhead offset (seconds) into the track at `startedAt`. */
  positionAtStart: number;
  paused: boolean;
  /** Server epoch ms when playback was paused (null while playing). */
  pausedAt: number | null;
}

export interface PartyState {
  roomId: string;
  createdAt: number;
  hostId: string;
  vibeId: VibeId;
  members: PartyMember[];
  queue: PartyTrack[];
  playback: PartyPlayback | null;
  reactions: PartyReaction[];
  /** Monotonic version bumped on every mutation; drives SSE clients. */
  version: number;
  /** Server wall-clock at serialization time (for client clock offset). */
  serverNow: number;
}

export const PARTY_EMOJIS = ["🔥", "❤️", "🎉", "💯", "👏"] as const;
export type PartyEmoji = (typeof PARTY_EMOJIS)[number];

export const PARTY_MAX_MEMBERS = 20;
export const PARTY_MAX_QUEUE = 50;
export const PARTY_MEMBER_IDLE_MS = 10 * 60 * 1000;
export const PARTY_ROOM_TTL_MS = 30 * 60 * 1000;
export const PARTY_REACTION_TTL_MS = 30 * 1000;

export const PARTY_VIBES: VibeId[] = ["all", "phonk", "lofi", "bollywood", "indie", "chill"];

/** Delta-sync patch: only fields that changed since the last broadcast. */
export type PartyPatch = Partial<Pick<PartyState, "hostId" | "vibeId" | "members" | "queue" | "playback" | "reactions">> & {
  version: number;
  serverNow: number;
};
