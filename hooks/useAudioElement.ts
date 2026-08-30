"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AudioEventHandlers {
  onTimeUpdate?: () => void;
  onLoadedMetadata?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onWaiting?: () => void;
  onPlaying?: () => void;
  onEnded?: () => void;
  onError?: () => void;
}

interface UseAudioElementReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  crossfadeTo: (src: string, fadeMs?: number) => void;
  /** The element that is currently the playback surface (crossfade-aware). */
  getActiveAudio: () => HTMLAudioElement | null;
  /**
   * Hard-stop playback: cancels any in-flight crossfade, then pauses and
   * clears BOTH audio elements and re-centers on the primary element. Guarantees
   * no orphaned/previous source can keep (or later resume) playing.
   */
  stopPlayback: () => void;
  /** Apply the user's volume to all audio surfaces. */
  applyVolume: (volume: number) => void;
}

const CROSSFADE_DEFAULT_MS = 3000;

export function useAudioElement(handlers: AudioEventHandlers = {}): UseAudioElementReturn {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const secondaryRef = useRef<HTMLAudioElement | null>(null);
  const activeIsPrimaryRef = useRef(true);
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crossfadeTokenRef = useRef(0);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const audioA = new Audio();
    audioA.preload = "auto";
    const audioB = new Audio();
    audioB.preload = "auto";
    audioRef.current = audioA;
    secondaryRef.current = audioB;
    activeIsPrimaryRef.current = true;

    const handleTimeUpdate = (el: HTMLAudioElement) => {
      if ((activeIsPrimaryRef.current && el === audioA) || (!activeIsPrimaryRef.current && el === audioB)) {
        setCurrentTime(el.currentTime || 0);
      }
      handlersRef.current.onTimeUpdate?.();
    };
    const handleLoadedMetadata = (el: HTMLAudioElement) => {
      if ((activeIsPrimaryRef.current && el === audioA) || (!activeIsPrimaryRef.current && el === audioB)) {
        if (el.duration && !isNaN(el.duration)) setDuration(el.duration);
      }
      handlersRef.current.onLoadedMetadata?.();
    };
    const handlePlay = (el: HTMLAudioElement) => {
      if ((activeIsPrimaryRef.current && el === audioA) || (!activeIsPrimaryRef.current && el === audioB)) {
        setIsPlaying(true);
        setIsLoading(false);
      }
      handlersRef.current.onPlay?.();
    };
    const handlePause = (el: HTMLAudioElement) => {
      if ((activeIsPrimaryRef.current && el === audioA) || (!activeIsPrimaryRef.current && el === audioB)) {
        setIsPlaying(false);
      }
      handlersRef.current.onPause?.();
    };
    const handleWaiting = (el: HTMLAudioElement) => {
      if ((activeIsPrimaryRef.current && el === audioA) || (!activeIsPrimaryRef.current && el === audioB)) {
        setIsLoading(true);
      }
      handlersRef.current.onWaiting?.();
    };
    const handlePlaying = (el: HTMLAudioElement) => {
      if ((activeIsPrimaryRef.current && el === audioA) || (!activeIsPrimaryRef.current && el === audioB)) {
        setIsLoading(false);
      }
      handlersRef.current.onPlaying?.();
    };
    const handleEnded = (el: HTMLAudioElement) => {
      if ((activeIsPrimaryRef.current && el === audioA) || (!activeIsPrimaryRef.current && el === audioB)) {
        handlersRef.current.onEnded?.();
      }
    };
    const handleError = (el: HTMLAudioElement) => {
      if ((activeIsPrimaryRef.current && el === audioA) || (!activeIsPrimaryRef.current && el === audioB)) {
        handlersRef.current.onError?.();
      }
    };

    const bind = (el: HTMLAudioElement) => {
      el.addEventListener("timeupdate", () => handleTimeUpdate(el));
      el.addEventListener("loadedmetadata", () => handleLoadedMetadata(el));
      el.addEventListener("play", () => handlePlay(el));
      el.addEventListener("pause", () => handlePause(el));
      el.addEventListener("waiting", () => handleWaiting(el));
      el.addEventListener("playing", () => handlePlaying(el));
      el.addEventListener("ended", () => handleEnded(el));
      el.addEventListener("error", () => handleError(el));
    };

    bind(audioA);
    bind(audioB);

    return () => {
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
      [audioA, audioB].forEach((el) => {
        el.pause();
        el.removeAttribute("src");
        el.load();
      });
      audioRef.current = null;
      secondaryRef.current = null;
    };
  }, []);

  const crossfadeTo = useCallback((src: string, fadeMs = CROSSFADE_DEFAULT_MS) => {
    const outgoing = activeIsPrimaryRef.current ? audioRef.current : secondaryRef.current;
    const incoming = activeIsPrimaryRef.current ? secondaryRef.current : audioRef.current;
    if (!outgoing || !incoming) return;

    // A token lets stopPlayback() cancel an in-flight crossfade so a stale
    // source can never resume (or complete) after ownership has moved on.
    const token = crossfadeTokenRef.current + 1;
    crossfadeTokenRef.current = token;

    const targetVolume = parseFloat(outgoing.getAttribute("data-volume") || "0.75");

    incoming.src = src;
    incoming.load();

    const startFade = () => {
      if (crossfadeTokenRef.current !== token) return;
      const steps = 20;
      const stepDuration = fadeMs / steps;
      let step = 0;

      const tick = () => {
        if (crossfadeTokenRef.current !== token) return;
        step++;
        const progress = step / steps;
        const outVol = targetVolume * (1 - progress);
        const inVol = targetVolume * progress;

        try {
          outgoing.volume = Math.max(0, outVol);
          incoming.volume = Math.min(targetVolume, inVol);
        } catch {
          // detached element
        }

        if (step < steps) {
          crossfadeTimerRef.current = setTimeout(tick, stepDuration);
        } else {
          outgoing.pause();
          outgoing.currentTime = 0;
          try {
            outgoing.volume = targetVolume;
          } catch {
            // detached
          }
          activeIsPrimaryRef.current = !activeIsPrimaryRef.current;
          crossfadeTimerRef.current = null;
        }
      };

      incoming.play().then(() => {
        if (crossfadeTokenRef.current === token) tick();
      }).catch(() => {});
    };

    const onCanPlay = () => {
      if (crossfadeTokenRef.current === token) startFade();
    };

    if (incoming.readyState >= 2) {
      startFade();
    } else {
      incoming.addEventListener("canplay", onCanPlay, { once: true });
    }
  }, []);

  const getActiveAudio = useCallback((): HTMLAudioElement | null => {
    return activeIsPrimaryRef.current ? audioRef.current : secondaryRef.current;
  }, []);

  const stopPlayback = useCallback(() => {
    // Invalidate any in-flight crossfade/fade.
    crossfadeTokenRef.current += 1;
    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    // Pause + clear BOTH surfaces so no orphaned source keeps playing or can
    // resume later (load() also aborts any pending network load/play).
    [audioRef.current, secondaryRef.current].forEach((el) => {
      if (!el) return;
      el.pause();
      el.removeAttribute("src");
      try {
        el.load();
      } catch {
        // detached/cleared element
      }
    });
    activeIsPrimaryRef.current = true;
  }, []);

  const applyVolume = useCallback((volume: number) => {
    [audioRef.current, secondaryRef.current].forEach((el) => {
      if (el) el.volume = volume;
    });
  }, []);

  return {
    audioRef,
    currentTime,
    duration,
    isPlaying,
    isLoading,
    crossfadeTo,
    getActiveAudio,
    stopPlayback,
    applyVolume,
  };
}
