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
  /** Resolve the element that is currently audible (the crossfade target). */
  getActive: () => HTMLAudioElement | null;
  /** Pause + reset both audio nodes so no stale element can keep playing. */
  pauseAll: () => void;
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

    const targetVolume = parseFloat(outgoing.getAttribute("data-volume") || "0.75");

    incoming.src = src;
    incoming.load();

    const startFade = () => {
      const steps = 20;
      const stepDuration = fadeMs / steps;
      let step = 0;

      const tick = () => {
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

      incoming.play().then(() => tick()).catch(() => {});
    };

    if (incoming.readyState >= 2) {
      startFade();
    } else {
      incoming.addEventListener("canplay", startFade, { once: true });
    }
  }, []);

  const getActive = useCallback(() => {
    return activeIsPrimaryRef.current ? audioRef.current : secondaryRef.current;
  }, []);

  const pauseAll = useCallback(() => {
    [audioRef.current, secondaryRef.current].forEach((el) => {
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
    });
  }, []);

  return {
    audioRef,
    currentTime,
    duration,
    isPlaying,
    isLoading,
    crossfadeTo,
    getActive,
    pauseAll,
  };
}
