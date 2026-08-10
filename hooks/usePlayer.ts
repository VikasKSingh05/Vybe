"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Track, VibeId } from "@/data/types";
import {
  findTrackById,
  getNextTrack,
  getPrevTrack,
  getVibeTheme,
} from "@/data/vibes";
import { useYouTubePlayer } from "./useYouTubePlayer";

interface UsePlayerOptions {
  initialVibeId?: VibeId;
  autoPlay?: boolean;
}

export function usePlayer({
  initialVibeId = "all",
  autoPlay = false,
}: UsePlayerOptions = {}) {
  const [vibeId, setVibeId] = useState<VibeId>(initialVibeId);
  const [trackId, setTrackId] = useState<string>(
    () => getVibeTheme(initialVibeId).tracks[0].id,
  );
  const [volume, setVolumeState] = useState(0.75);
  const [isMuted, setIsMutedState] = useState(false);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  const theme = getVibeTheme(vibeId);
  const rawTrack = findTrackById(trackId) ?? theme.tracks[0];

  // Auto-generate YouTube cover thumbnail if not provided
  const track: Track = {
    ...rawTrack,
    cover: rawTrack.cover || `https://img.youtube.com/vi/${rawTrack.youtubeId}/hqdefault.jpg`,
  };

  const trackRef = useRef(track);
  trackRef.current = track;

  const vibeIdRef = useRef(vibeId);
  vibeIdRef.current = vibeId;

  // Next track callback for YouTube end event or error skip
  const handleTrackEnd = useCallback(() => {
    setIsUserInteracted(true);
    const nextTrack = getNextTrack(trackRef.current.id, vibeIdRef.current);
    if (nextTrack) {
      setTrackId(nextTrack.id);
    }
  }, []);

  const ytPlayer = useYouTubePlayer({
    onEnded: handleTrackEnd,
  });

  // Load video when trackId changes
  const prevTrackIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevTrackIdRef.current !== trackId) {
      const isInitial = prevTrackIdRef.current === null;
      prevTrackIdRef.current = trackId;

      if (ytPlayer.isReady) {
        if (!isInitial || isUserInteracted || autoPlay) {
          ytPlayer.loadVideo(track.youtubeId, true);
        }
      }
    }
  }, [trackId, track.youtubeId, isUserInteracted, autoPlay, ytPlayer]);

  // Sync volume & mute state to YouTube player
  useEffect(() => {
    if (ytPlayer.isReady) {
      ytPlayer.setVolume(isMuted ? 0 : volume);
      ytPlayer.setMuted(isMuted);
    }
  }, [volume, isMuted, ytPlayer]);

  const togglePlay = useCallback(() => {
    setIsUserInteracted(true);
    if (ytPlayer.isPlaying) {
      ytPlayer.pause();
    } else {
      if (prevTrackIdRef.current === trackId && !ytPlayer.isPlaying) {
        // If initial load haven't loaded video yet
        ytPlayer.loadVideo(track.youtubeId, true);
      } else {
        ytPlayer.play();
      }
    }
  }, [ytPlayer, trackId, track.youtubeId]);

  const play = useCallback(() => {
    setIsUserInteracted(true);
    if (prevTrackIdRef.current === trackId && !ytPlayer.isPlaying) {
      ytPlayer.loadVideo(track.youtubeId, true);
    } else {
      ytPlayer.play();
    }
  }, [ytPlayer, trackId, track.youtubeId]);

  const pause = useCallback(() => {
    ytPlayer.pause();
  }, [ytPlayer]);

  const seek = useCallback(
    (time: number) => {
      ytPlayer.seekTo(time);
    },
    [ytPlayer],
  );

  const next = useCallback(() => {
    setIsUserInteracted(true);
    const nextTrack = getNextTrack(trackId, vibeId);
    if (nextTrack) {
      setTrackId(nextTrack.id);
    }
  }, [trackId, vibeId]);

  const prev = useCallback(() => {
    setIsUserInteracted(true);
    if (ytPlayer.currentTime > 3) {
      seek(0);
      return;
    }
    const prevTrack = getPrevTrack(trackId, vibeId);
    if (prevTrack) {
      setTrackId(prevTrack.id);
    }
  }, [ytPlayer.currentTime, seek, trackId, vibeId]);

  const changeVibe = useCallback(
    (newVibeId: VibeId) => {
      setIsUserInteracted(true);
      setVibeId(newVibeId);
      const newTheme = getVibeTheme(newVibeId);
      setTrackId(newTheme.tracks[0].id);
    },
    [],
  );

  const changeVolume = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      setVolumeState(clamped);
      if (clamped > 0) setIsMutedState(false);
    },
    [],
  );

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => !prev);
  }, []);

  const currentDuration = ytPlayer.duration > 0 ? ytPlayer.duration : track.duration;

  return {
    vibeId,
    theme,
    track,
    isPlaying: ytPlayer.isPlaying,
    currentTime: ytPlayer.currentTime,
    duration: currentDuration,
    volume,
    isMuted,
    togglePlay,
    play,
    pause,
    seek,
    next,
    prev,
    changeVibe,
    changeVolume,
    toggleMute,
    progress: currentDuration > 0 ? (ytPlayer.currentTime / currentDuration) * 100 : 0,
  };
}

export type PlayerState = ReturnType<typeof usePlayer>;
