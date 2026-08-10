"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  loadVideoById: (videoId: string | { videoId: string; startSeconds?: number }, startSeconds?: number) => void;
  cueVideoById: (videoId: string | { videoId: string; startSeconds?: number }, startSeconds?: number) => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void; // 0 - 100
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface UseYouTubePlayerOptions {
  onEnded?: () => void;
  onReady?: () => void;
}

export function useYouTubePlayer({ onEnded, onReady }: UseYouTubePlayerOptions = {}) {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Single mount effect: Create persistent hidden container in body
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Create persistent DOM element if not already present
    let container = document.getElementById("vybe-yt-audio-container") as HTMLDivElement | null;
    if (!container) {
      container = document.createElement("div");
      container.id = "vybe-yt-audio-container";
      container.style.position = "fixed";
      container.style.bottom = "-9999px";
      container.style.right = "-9999px";
      container.style.width = "200px";
      container.style.height = "200px";
      container.style.opacity = "0";
      container.style.pointerEvents = "none";
      document.body.appendChild(container);
    }
    containerRef.current = container;

    // Create target inner element for YT Player replacement
    let target = document.getElementById("vybe-yt-target");
    if (!target) {
      target = document.createElement("div");
      target.id = "vybe-yt-target";
      container.appendChild(target);
    }

    const initYT = () => {
      if (playerRef.current || !window.YT || !window.YT.Player) return;

      const targetEl = document.getElementById("vybe-yt-target");
      if (!targetEl) return;

      try {
        playerRef.current = new window.YT.Player("vybe-yt-target", {
          height: "200",
          width: "200",
          videoId: "uOQk40S9m3o",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              setIsReady(true);
              try {
                setDuration(event.target.getDuration() || 0);
              } catch {
                // ignore
              }
              onReadyRef.current?.();
            },
            onStateChange: (event) => {
              const state = event.data;
              if (window.YT) {
                if (state === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                  try {
                    setDuration(event.target.getDuration() || 0);
                  } catch {
                    // ignore
                  }
                } else if (state === window.YT.PlayerState.PAUSED) {
                  setIsPlaying(false);
                } else if (state === window.YT.PlayerState.ENDED) {
                  setIsPlaying(false);
                  onEndedRef.current?.();
                }
              }
            },
            onError: (event) => {
              console.warn("YouTube Player error:", event.data);
              setIsPlaying(false);
              setTimeout(() => {
                onEndedRef.current?.();
              }, 400);
            },
          },
        });
      } catch (err) {
        console.error("Failed to init YouTube Player:", err);
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      if (!document.getElementById("youtube-iframe-api")) {
        const script = document.createElement("script");
        script.id = "youtube-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        initYT();
      };

      const pollInterval = setInterval(() => {
        if (window.YT && window.YT.Player && !playerRef.current) {
          initYT();
          if (playerRef.current) clearInterval(pollInterval);
        }
      }, 250);

      return () => clearInterval(pollInterval);
    }
  }, []); // Run ONLY once on mount

  // Polling timer to update currentTime while playing
  useEffect(() => {
    let timeInterval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && playerRef.current) {
      timeInterval = setInterval(() => {
        try {
          if (playerRef.current) {
            const cur = playerRef.current.getCurrentTime() || 0;
            const dur = playerRef.current.getDuration() || 0;
            setCurrentTime(cur);
            if (dur > 0) setDuration(dur);
          }
        } catch {
          // ignore
        }
      }, 400);
    }

    return () => {
      if (timeInterval) clearInterval(timeInterval);
    };
  }, [isPlaying]);

  const play = useCallback(() => {
    try {
      if (playerRef.current) {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const pause = useCallback(() => {
    try {
      if (playerRef.current) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadVideo = useCallback((videoId: string, autoPlayTrack = true) => {
    try {
      if (playerRef.current) {
        if (autoPlayTrack) {
          playerRef.current.loadVideoById(videoId);
          setIsPlaying(true);
        } else {
          playerRef.current.cueVideoById(videoId);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    try {
      if (playerRef.current) {
        playerRef.current.seekTo(seconds, true);
        setCurrentTime(seconds);
      }
    } catch {
      // ignore
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    try {
      if (playerRef.current) {
        playerRef.current.setVolume(Math.round(vol * 100));
      }
    } catch {
      // ignore
    }
  }, []);

  const setMuted = useCallback((mute: boolean) => {
    try {
      if (playerRef.current) {
        if (mute) playerRef.current.mute();
        else playerRef.current.unMute();
      }
    } catch {
      // ignore
    }
  }, []);

  return {
    isReady,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    loadVideo,
    seekTo,
    setVolume,
    setMuted,
  };
}
