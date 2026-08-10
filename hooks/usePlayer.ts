"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Track, VibeId } from "@/data/types";
import {
  findTrackById,
  getNextTrack,
  getPrevTrack,
  getVibeTheme,
} from "@/data/vibes";

interface UsePlayerOptions {
  initialVibeId?: VibeId;
  autoPlay?: boolean;
}

export function usePlayer({ initialVibeId = "all", autoPlay = true }: UsePlayerOptions = {}) {
  const [vibeId, setVibeId] = useState<VibeId>(initialVibeId);
  const [trackId, setTrackId] = useState<string>(() => getVibeTheme(initialVibeId).tracks[0].id);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const theme = getVibeTheme(vibeId);
  const track = findTrackById(trackId) ?? theme.tracks[0];

  const clearSimInterval = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  }, []);

  const startSimulatedPlayback = useCallback(() => {
    clearSimInterval();
    simIntervalRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= track.duration) return 0;
        return prev + 1;
      });
    }, 1000);
  }, [clearSimInterval, track.duration]);

  useEffect(() => {
    setCurrentTime(0);
    clearSimInterval();

    if (isPlaying) {
      startSimulatedPlayback();
    }

    return clearSimInterval;
  }, [trackId, vibeId, isPlaying, clearSimInterval, startSimulatedPlayback]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, track.duration));
      setCurrentTime(clamped);
    },
    [track.duration],
  );

  const next = useCallback(() => {
    const nextTrack = getNextTrack(trackId, vibeId);
    if (nextTrack) setTrackId(nextTrack.id);
  }, [trackId, vibeId]);

  const prev = useCallback(() => {
    if (currentTime > 3) {
      seek(0);
      return;
    }
    const prevTrack = getPrevTrack(trackId, vibeId);
    if (prevTrack) setTrackId(prevTrack.id);
  }, [currentTime, seek, trackId, vibeId]);

  const changeVibe = useCallback((newVibeId: VibeId) => {
    setVibeId(newVibeId);
    const newTheme = getVibeTheme(newVibeId);
    setTrackId(newTheme.tracks[0].id);
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const changeVolume = useCallback((v: number) => {
    setVolume(Math.max(0, Math.min(1, v)));
    if (v > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    vibeId,
    theme,
    track,
    isPlaying,
    currentTime,
    duration: track.duration,
    volume,
    isMuted,
    audioRef,
    togglePlay,
    play,
    pause,
    seek,
    next,
    prev,
    changeVibe,
    changeVolume,
    toggleMute,
    progress: track.duration > 0 ? (currentTime / track.duration) * 100 : 0,
  };
}

export type PlayerState = ReturnType<typeof usePlayer>;
