/**
 * Shared command dispatch logic used by both the in-memory and Redis stores.
 * The `apply` callback handles persistence — sync for memory, async for Redis.
 */
import type { Song } from "@/types/music";
import type { PartyMember, PartyState } from "./types";
import { PARTY_EMOJIS, PARTY_MAX_QUEUE } from "./types";
import type { DispatchResult } from "./store-interface";

export type ApplyFn = (mutator: (s: PartyState) => void) => PartyState | null | Promise<PartyState | null>;

const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateId(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) out += ID_ALPHABET[byte % ID_ALPHABET.length];
  return out;
}

export function sanitizeName(name: string, fallback: string): string {
  const trimmed = name.trim().slice(0, 24);
  return trimmed || fallback;
}

function isValidSong(song: unknown): song is Song {
  if (!song || typeof song !== "object") return false;
  const s = song as Song;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    typeof s.streamUrl === "string" &&
    s.streamUrl.length > 0
  );
}

function startPlayback(state: PartyState, queueIndex: number, position = 0, paused = false): void {
  const track = state.queue[queueIndex];
  const now = Date.now();
  if (!track) {
    state.playback = null;
    return;
  }
  state.playback = {
    queueId: track.queueId,
    startedAt: now,
    positionAtStart: position,
    paused,
    pausedAt: paused ? now : null,
  };
}

function currentQueueIndex(state: PartyState): number {
  if (!state.playback?.queueId) return -1;
  return state.queue.findIndex((t) => t.queueId === state.playback?.queueId);
}

function ok(state: PartyState): DispatchResult {
  return { ok: true, state };
}

function err(status: number, error: string): DispatchResult {
  return { ok: false, status, error };
}

type CommandResult = DispatchResult | Promise<DispatchResult>;

export function dispatchCommand(
  state: PartyState,
  member: PartyMember,
  command: string,
  payload: Record<string, unknown> | undefined,
  apply: ApplyFn,
): CommandResult {
  const requiresHost = (): DispatchResult | null => {
    if (state.hostId !== member.id) {
      return err(403, "Only the host can do that");
    }
    return null;
  };

  const applyResult = (wire: PartyState | null): DispatchResult => {
    return wire ? ok(wire) : err(404, "Room not found");
  };

  const applyAsync = async (wire: Promise<PartyState | null>): Promise<DispatchResult> => {
    return applyResult(await wire);
  };

  switch (command) {
    case "leave": {
      const wire = apply((s) => {
        s.members = s.members.filter((m) => m.id !== member.id);
        s.reactions = s.reactions.filter((r) => r.memberId !== member.id);
        if (s.hostId === member.id) {
          const nextHost = s.members[0] ?? null;
          if (nextHost) {
            nextHost.isHost = true;
            s.hostId = nextHost.id;
          }
        }
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "addTrack": {
      const song = payload?.song;
      if (!isValidSong(song)) return err(400, "Invalid song payload");
      if (state.queue.length >= PARTY_MAX_QUEUE) return err(429, "Queue is full");
      if (state.queue.some((t) => t.song.id === song.id)) {
        return err(409, "This song is already in the queue");
      }
      const wire = apply((s) => {
        s.queue.push({
          queueId: generateId(10),
          song: {
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            artwork: song.artwork,
            duration: song.duration,
            streamUrl: song.streamUrl,
            provider: song.provider,
          },
          addedBy: member.id,
          addedByName: member.name,
        });
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "removeTrack": {
      const queueId = typeof payload?.queueId === "string" ? payload.queueId : null;
      if (!queueId) return err(400, "Missing queueId");
      const track = state.queue.find((t) => t.queueId === queueId);
      if (!track) return err(404, "Track not in queue");
      const canRemove = state.hostId === member.id || track.addedBy === member.id;
      if (!canRemove) return err(403, "Only the host or the person who added it can remove this");
      const wire = apply((s) => {
        const idx = s.queue.findIndex((t) => t.queueId === queueId);
        if (idx === -1) return;
        const removedPlaying = s.playback?.queueId === queueId;
        s.queue.splice(idx, 1);
        if (removedPlaying) {
          const nextIdx = s.queue[idx] ? idx : Math.max(0, s.queue.length - 1);
          startPlayback(s, nextIdx);
        }
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "next": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply((s) => {
        if (s.queue.length === 0) { s.playback = null; return; }
        const idx = currentQueueIndex(s);
        startPlayback(s, (idx + 1) % s.queue.length);
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "prev": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply((s) => {
        if (s.queue.length === 0) { s.playback = null; return; }
        const idx = currentQueueIndex(s);
        const prevIdx = idx > 0 ? idx - 1 : s.queue.length - 1;
        startPlayback(s, prevIdx);
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "play": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply((s) => {
        if (!s.playback || !s.playback.queueId) {
          startPlayback(s, s.queue.length > 0 ? 0 : -1);
          return;
        }
        if (s.playback.paused) {
          const now = Date.now();
          const pos = (s.playback.pausedAt ?? now) / 1000 - s.playback.startedAt / 1000 + s.playback.positionAtStart;
          s.playback = { ...s.playback, startedAt: now, positionAtStart: Math.max(0, pos), paused: false, pausedAt: null };
        }
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "pause": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply((s) => {
        if (s.playback && !s.playback.paused) {
          s.playback = { ...s.playback, paused: true, pausedAt: Date.now() };
        }
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "seek": {
      const denied = requiresHost();
      if (denied) return denied;
      const seconds = Number(payload?.seconds);
      if (!Number.isFinite(seconds) || seconds < 0) return err(400, "Invalid seek position");
      const wire = apply((s) => {
        if (!s.playback) return;
        const now = Date.now();
        s.playback = { ...s.playback, startedAt: now, positionAtStart: seconds, pausedAt: s.playback.paused ? now : null };
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "playTrack": {
      const denied = requiresHost();
      if (denied) return denied;
      const queueId = typeof payload?.queueId === "string" ? payload.queueId : null;
      if (!queueId) return err(400, "Missing queueId");
      const wire = apply((s) => {
        const idx = s.queue.findIndex((t) => t.queueId === queueId);
        if (idx === -1) return;
        startPlayback(s, idx);
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "clearQueue": {
      const denied = requiresHost();
      if (denied) return denied;
      const wire = apply((s) => { s.queue = []; s.playback = null; });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    case "reaction": {
      const emoji = payload?.emoji;
      if (typeof emoji !== "string" || !(PARTY_EMOJIS as readonly string[]).includes(emoji)) {
        return err(400, "Invalid reaction emoji");
      }
      const wire = apply((s) => {
        s.reactions.push({
          id: generateId(10),
          memberId: member.id,
          memberName: member.name,
          emoji,
          at: Date.now(),
        });
      });
      return wire instanceof Promise ? applyAsync(wire) : applyResult(wire);
    }

    default:
      return err(400, `Unknown command: ${command}`);
  }
}
