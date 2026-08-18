"use client";

import { useEffect, useRef, useState } from "react";

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
}

export function useAudioElement(handlers: AudioEventHandlers = {}): UseAudioElementReturn {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      handlersRef.current.onTimeUpdate?.();
    };
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration);
      handlersRef.current.onLoadedMetadata?.();
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
      handlersRef.current.onPlay?.();
    };
    const handlePause = () => {
      setIsPlaying(false);
      handlersRef.current.onPause?.();
    };
    const handleWaiting = () => {
      setIsLoading(true);
      handlersRef.current.onWaiting?.();
    };
    const handlePlaying = () => {
      setIsLoading(false);
      handlersRef.current.onPlaying?.();
    };
    const handleEnded = () => handlersRef.current.onEnded?.();
    const handleError = () => handlersRef.current.onError?.();

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  return { audioRef, currentTime, duration, isPlaying, isLoading };
}
