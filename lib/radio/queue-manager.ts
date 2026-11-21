import { getPlaylistForGenre } from "@/data/playlists";
import { discoverSongsForVibe } from "@/lib/music/discover";
import { RADIO_ENGINE_CONFIG, STATION_DEFINITIONS } from "./config";
import {
  normalizeTitleArtistKey,
  playlistEntryToStationTrack,
  songToStationTrack,
} from "./track";
import type { RadioStationId, StationTrack } from "./types";

export interface SelectionContext {
  stationId: RadioStationId;
  queueRefIds: Set<string>;
  historyRefIds: Set<string>;
  recentTitleArtist: Set<string>;
  lastArtist?: string;
  excludeRefId?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function passesFilters(track: StationTrack, ctx: SelectionContext): boolean {
  if (ctx.excludeRefId && track.refId === ctx.excludeRefId) return false;
  if (ctx.queueRefIds.has(track.refId)) return false;
  if (ctx.historyRefIds.has(track.refId)) return false;
  const ta = normalizeTitleArtistKey(track.title, track.artist);
  if (ctx.recentTitleArtist.has(ta)) return false;
  if (
    ctx.lastArtist &&
    track.artist.toLowerCase() === ctx.lastArtist.toLowerCase() &&
    ctx.recentTitleArtist.size > 3
  ) {
    return false;
  }
  return true;
}

function relaxFilters(track: StationTrack, ctx: SelectionContext): boolean {
  if (ctx.excludeRefId && track.refId === ctx.excludeRefId) return false;
  if (ctx.queueRefIds.has(track.refId)) return false;
  return true;
}

export async function discoverCandidates(
  stationId: RadioStationId,
  count: number,
  excludeIds: Set<string>,
): Promise<StationTrack[]> {
  const songs = await discoverSongsForVibe(stationId, count, excludeIds);
  const tracks: StationTrack[] = [];
  for (const song of songs) {
    const track = songToStationTrack(song);
    if (track) tracks.push(track);
  }
  return tracks;
}

export function seedCandidates(stationId: RadioStationId): StationTrack[] {
  const entries = shuffle(getPlaylistForGenre(stationId));
  const tracks: StationTrack[] = [];
  for (const entry of entries) {
    const track = playlistEntryToStationTrack(entry);
    if (track) tracks.push(track);
  }
  return tracks;
}

export function pickNextTrack(
  candidates: StationTrack[],
  ctx: SelectionContext,
): StationTrack | null {
  for (const track of candidates) {
    if (passesFilters(track, ctx)) return track;
  }
  for (const track of candidates) {
    if (relaxFilters(track, ctx)) return track;
  }
  return candidates[0] ?? null;
}

export async function fillQueue(
  stationId: RadioStationId,
  existingQueue: StationTrack[],
  history: string[],
  current: StationTrack | null,
  targetSize: number,
): Promise<StationTrack[]> {
  const queue = [...existingQueue];
  const queueRefIds = new Set(queue.map((t) => t.refId));
  const historyRefIds = new Set(history.slice(-RADIO_ENGINE_CONFIG.recentAvoidWindow));
  const recentTitleArtist = new Set<string>();

  for (const ref of history.slice(-12)) {
    const fromQueue = queue.find((t) => t.refId === ref);
    const fromCurrent = current?.refId === ref ? current : null;
    const t = fromQueue ?? fromCurrent;
    if (t) recentTitleArtist.add(normalizeTitleArtistKey(t.title, t.artist));
  }

  let lastArtist = current?.artist ?? queue[queue.length - 1]?.artist;
  let attempts = 0;

  while (queue.length < targetSize && attempts < 8) {
    attempts += 1;
    const excludeIds = new Set<string>([
      ...history,
      ...queue.map((t) => t.trackId),
      ...(current ? [current.trackId] : []),
    ]);

    let pool = await discoverCandidates(
      stationId,
      RADIO_ENGINE_CONFIG.discoveryBatchSize,
      excludeIds,
    );

    if (pool.length === 0) {
      pool = seedCandidates(stationId);
    }

    const ctx: SelectionContext = {
      stationId,
      queueRefIds,
      historyRefIds,
      recentTitleArtist,
      lastArtist,
    };

    const picked = pickNextTrack(pool, ctx);
    if (!picked) break;

    if (queueRefIds.has(picked.refId)) continue;

    queue.push(picked);
    queueRefIds.add(picked.refId);
    historyRefIds.add(picked.refId);
    recentTitleArtist.add(normalizeTitleArtistKey(picked.title, picked.artist));
    lastArtist = picked.artist;
  }

  return queue.slice(0, RADIO_ENGINE_CONFIG.queueTarget);
}

export function stationMeta(stationId: RadioStationId) {
  return STATION_DEFINITIONS[stationId];
}
