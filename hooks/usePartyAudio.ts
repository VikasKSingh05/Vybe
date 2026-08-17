"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PartyState } from "@/lib/party/types";
import { effectivePosition, playbackSignature } from "@/lib/party/clock";

const DRIFT_CHECK_MS = 10_000;
const DRIFT_TOLERANCE_S = 0.35;

interface UsePartyAudioOptions {
  state: PartyState | null;
  onTrackEnded: () => void;
}

export function usePartyAudio({ state, onTrackEnded }: UsePartyAudioOptions) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(0.75);
  const [isMuted, setIsMutedState] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clockOffsetRef = useRef(0);
  const appliedSigRef = useRef("");
  const onEndedRef = useRef(onTrackEnded);

  useEffect(() => {
    onEndedRef.current = onTrackEnded;
  }, [onTrackEnded]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(Math.max(v, 0), 1);
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  // Mount: create the audio element once and drive UI state from its events.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleEnded = () => onEndedRef.current();

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Conductor transitions: mutate the audio element directly (no setState).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    clockOffsetRef.current = (state?.serverNow ?? Date.now()) - Date.now();

    const sig = playbackSignature(state?.playback ?? null);
    if (sig === appliedSigRef.current) return;
    appliedSigRef.current = sig;

    const playback = state?.playback ?? null;
    const track = playback?.queueId
      ? state?.queue.find((t) => t.queueId === playback.queueId)
      : null;

    if (!track || !track.song.streamUrl) {
      audio.pause();
      audio.removeAttribute("src");
      return;
    }

    const target = Math.max(0, effectivePosition(playback));

    if (audio.src !== track.song.streamUrl && !audio.src.endsWith(track.song.streamUrl)) {
      audio.src = track.song.streamUrl;
      try {
        audio.currentTime = target;
      } catch {
        // currentTime may be unsettable before metadata; drift check fixes it
      }
    } else {
      try {
        if (Math.abs(audio.currentTime - target) > DRIFT_TOLERANCE_S) {
          audio.currentTime = target;
        }
      } catch {
        // ignore transient errors
      }
    }

    if (playback?.paused) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [state]);

  // Periodic drift correction between conductor clock and the audio element.
  useEffect(() => {
    const id = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      const playback = state?.playback;
      if (!playback || playback.paused || !playback.queueId) return;
      const expected = effectivePosition(playback, Date.now() + clockOffsetRef.current);
      if (Math.abs(audio.currentTime - expected) > DRIFT_TOLERANCE_S) {
        try {
          audio.currentTime = expected;
        } catch {
          // ignore
        }
      }
    }, DRIFT_CHECK_MS);
    return () => clearInterval(id);
  }, [state?.playback]);

  return {
    currentTime,
    duration,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    setVolume,
    toggleMute,
  };
}
