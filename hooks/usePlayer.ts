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

export function usePlayer({
  initialVibeId = "all",
  autoPlay = false,
}: UsePlayerOptions = {}) {
  const [vibeId, setVibeId] = useState<VibeId>(initialVibeId);
  const [trackId, setTrackId] = useState<string>(
    () => getVibeTheme(initialVibeId).tracks[0].id,
  );
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const synthNodesRef = useRef<AudioNode[]>([]);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const theme = getVibeTheme(vibeId);
  const track = findTrackById(trackId) ?? theme.tracks[0];

  // Helper to stop Web Audio synth nodes
  const stopSynth = useCallback(() => {
    synthNodesRef.current.forEach((node) => {
      try {
        if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore
      }
    });
    synthNodesRef.current = [];
  }, []);

  // Web Audio Synth generator per vibe
  const startSynth = useCallback(
    (preset?: string) => {
      stopSynth();

      if (typeof window === "undefined") return;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      if (!masterGainRef.current) {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        masterGainRef.current = gain;
      }

      const master = masterGainRef.current;
      master.gain.setValueAtTime(isMuted ? 0 : volume * 0.25, ctx.currentTime);

      const nodes: AudioNode[] = [];
      const currentPreset = preset || track.synthPreset || "chill";

      try {
        if (currentPreset === "phonk") {
          // Dark sub-bass + noise
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(65, ctx.currentTime);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(280, ctx.currentTime);

          osc.connect(filter);
          filter.connect(master);
          osc.start();
          nodes.push(osc, filter);
        } else if (currentPreset === "lofi") {
          // Warm low-pass chord pad
          [220, 261.63, 329.63, 392.0].forEach((freq) => {
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(450, ctx.currentTime);

            osc.connect(filter);
            filter.connect(master);
            osc.start();
            nodes.push(osc, filter);
          });
        } else if (currentPreset === "sitar" || currentPreset === "bollywood") {
          // Indian Tanpura drone harmonics
          [146.83, 220.0, 293.66, 440.0].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = i % 2 === 0 ? "triangle" : "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.15, ctx.currentTime);

            osc.connect(gainNode);
            gainNode.connect(master);
            osc.start();
            nodes.push(osc, gainNode);
          });
        } else if (currentPreset === "indie") {
          // Acoustic acoustic warmth
          [164.81, 246.94, 329.63].forEach((freq) => {
            const osc = ctx.createOscillator();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.connect(master);
            osc.start();
            nodes.push(osc);
          });
        } else {
          // Chill blue hour ambient pad
          [130.81, 196.0, 246.94, 349.23].forEach((freq) => {
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(500, ctx.currentTime);

            osc.connect(filter);
            filter.connect(master);
            osc.start();
            nodes.push(osc, filter);
          });
        }
      } catch {
        // Fallback gracefully if Web Audio API hits browser restrictions
      }

      synthNodesRef.current = nodes;
    },
    [isMuted, stopSynth, track.synthPreset, volume],
  );

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
        if (prev >= track.duration) {
          // Auto advance to next track
          const nextTrack = getNextTrack(trackId, vibeId);
          if (nextTrack) {
            setTrackId(nextTrack.id);
          }
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  }, [clearSimInterval, track.duration, trackId, vibeId]);

  // Handle Playback State
  useEffect(() => {
    if (isPlaying) {
      startSimulatedPlayback();
      if (isUserInteracted) {
        startSynth();
      }
    } else {
      clearSimInterval();
      stopSynth();
    }

    return () => {
      clearSimInterval();
      stopSynth();
    };
  }, [isPlaying, trackId, vibeId, startSimulatedPlayback, clearSimInterval, startSynth, stopSynth, isUserInteracted]);

  // Volume & Mute Updates
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const targetGain = isMuted ? 0 : volume * 0.25;
      masterGainRef.current.gain.setTargetAtTime(
        targetGain,
        audioCtxRef.current.currentTime,
        0.05,
      );
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    setIsUserInteracted(true);
    setIsPlaying((prev) => !prev);
  }, []);

  const play = useCallback(() => {
    setIsUserInteracted(true);
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, track.duration));
      setCurrentTime(clamped);
    },
    [track.duration],
  );

  const next = useCallback(() => {
    setIsUserInteracted(true);
    const nextTrack = getNextTrack(trackId, vibeId);
    if (nextTrack) {
      setTrackId(nextTrack.id);
      setCurrentTime(0);
    }
  }, [trackId, vibeId]);

  const prev = useCallback(() => {
    setIsUserInteracted(true);
    if (currentTime > 3) {
      seek(0);
      return;
    }
    const prevTrack = getPrevTrack(trackId, vibeId);
    if (prevTrack) {
      setTrackId(prevTrack.id);
      setCurrentTime(0);
    }
  }, [currentTime, seek, trackId, vibeId]);

  const changeVibe = useCallback((newVibeId: VibeId) => {
    setIsUserInteracted(true);
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
