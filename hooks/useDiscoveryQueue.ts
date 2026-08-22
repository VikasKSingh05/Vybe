"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "@/types/music";
import type { PlaylistEntry } from "@/data/playlists";
import type { VibeId } from "@/data/types";

const BATCH_MIN = 5;
const BATCH_MAX = 8;
const REFILL_THRESHOLD = 3;
const FETCH_DELAY_MS = 400;

interface UseDiscoveryQueueOptions {
  vibeId: VibeId;
  queueItemIds: string[];
  addToQueue: (entry: PlaylistEntry, resolvedSong?: Song, forcePlay?: boolean) => void;
}

export function useDiscoveryQueue({
  vibeId,
  queueItemIds,
  addToQueue,
}: UseDiscoveryQueueOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRandom = vibeId === "random";
  const fetchInProgressRef = useRef(false);
  const mountedRef = useRef(true);
  const excludeIdsRef = useRef<Set<string>>(new Set());
  const pausedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    excludeIdsRef.current = new Set(queueItemIds);
  }, [queueItemIds]);

  const batchSize = BATCH_MIN + Math.floor(Math.random() * (BATCH_MAX - BATCH_MIN + 1));

  const fetchSongs = useCallback(
    async (count: number): Promise<Song[]> => {
      const exclude = Array.from(excludeIdsRef.current).join(",");
      const params = new URLSearchParams({ count: String(count) });
      if (exclude) params.set("exclude", exclude);

      const res = await fetch(`/api/music/discover?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json().catch(() => null)) as { songs?: Song[] } | null;
      return data?.songs ?? [];
    },
    [],
  );

  const addSongsToQueue = useCallback(
    (songs: Song[]) => {
      for (const song of songs) {
        if (excludeIdsRef.current.has(song.id)) continue;
        const entry: PlaylistEntry = {
          jiosaavnId: song.id,
          title: song.title,
          artist: song.artist,
          artwork: song.artwork,
          duration: song.duration,
        };
        addToQueue(entry, song);
      }
    },
    [addToQueue],
  );

  const generateBatch = useCallback(async () => {
    if (fetchInProgressRef.current || pausedRef.current) return;
    fetchInProgressRef.current = true;
    if (mountedRef.current) setIsGenerating(true);
    if (mountedRef.current) setError(null);

    try {
      const songs = await fetchSongs(batchSize);
      if (songs.length === 0 && mountedRef.current) {
        setError("Could not discover new songs");
      }
      if (mountedRef.current) {
        addSongsToQueue(songs);
      }
    } catch {
      if (mountedRef.current) setError("Discovery failed");
    } finally {
      fetchInProgressRef.current = false;
      if (mountedRef.current) setIsGenerating(false);
    }
  }, [batchSize, fetchSongs, addSongsToQueue]);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
  }, []);

  useEffect(() => {
    if (!isRandom || pausedRef.current) return;
    if (queueItemIds.length < REFILL_THRESHOLD && !fetchInProgressRef.current) {
      const timer = setTimeout(() => { void generateBatch(); }, FETCH_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isRandom, queueItemIds.length, generateBatch]);

  useEffect(() => {
    if (!isRandom || pausedRef.current) return;
    if (queueItemIds.length === 0 && !fetchInProgressRef.current) {
      const timer = setTimeout(() => { void generateBatch(); }, 50);
      return () => clearTimeout(timer);
    }
  }, [isRandom, queueItemIds.length, generateBatch]);

  useEffect(() => {
    if (!isRandom) {
      pausedRef.current = false;
      setError(null);
    }
  }, [isRandom]);

  return {
    isGenerating,
    error,
    pause,
    resume,
  };
}
