"use client";

import { useEffect, useRef } from "react";

interface UseMediaSessionOptions {
  /** Master switch — lets callers disable entirely (e.g. no active party track). */
  enabled?: boolean;
  title: string;
  artist: string;
  artwork?: string;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSeek?: (time: number) => void;
}

const SEEK_OFFSET_S = 10;

function mediaSessionSupported(): boolean {
  return (
    typeof navigator !== "undefined" && "mediaSession" in navigator
  );
}

/**
 * Bridges playback state to the browser Media Session API so the OS can show
 * lock-screen / notification controls with artwork and a live position.
 */
export function useMediaSession(options: UseMediaSessionOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const { enabled = true, isPlaying, duration, currentTime } = options;
  const { title, artist, artwork } = options;

  const supported =
    enabled &&
    typeof window !== "undefined" &&
    mediaSessionSupported();

  // Hardware/OS action handlers — registered once, always read fresh callbacks
  useEffect(() => {
    if (!supported) return;
    const session = navigator.mediaSession;

    session.setActionHandler("play", () => optionsRef.current.onPlay?.());
    session.setActionHandler("pause", () => optionsRef.current.onPause?.());
    session.setActionHandler("previoustrack", () => optionsRef.current.onPrev?.());
    session.setActionHandler("nexttrack", () => optionsRef.current.onNext?.());
    session.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) optionsRef.current.onSeek?.(details.seekTime);
    });
    session.setActionHandler("seekbackward", () => {
      const t = optionsRef.current;
      t.onSeek?.(Math.max(0, t.currentTime - SEEK_OFFSET_S));
    });
    session.setActionHandler("seekforward", () => {
      const t = optionsRef.current;
      t.onSeek?.(Math.min(t.duration || Infinity, t.currentTime + SEEK_OFFSET_S));
    });

    return () => {
      const actions = [
        "play",
        "pause",
        "previoustrack",
        "nexttrack",
        "seekto",
        "seekbackward",
        "seekforward",
      ] as const;
      for (const action of actions) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // Action unsupported on this platform — nothing to clean up
        }
      }
    };
  }, [supported]);

  // Metadata — update when the track changes
  useEffect(() => {
    if (!supported) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: "VYBE",
        ...(artwork ? { artwork: [{ src: artwork, sizes: "512x512" }] } : {}),
      });
    } catch {
      // Malformed artwork URL etc. — lock screen simply stays generic
    }
  }, [supported, title, artist, artwork]);

  // Playback state + position — keeps the OS scrubber accurate
  useEffect(() => {
    if (!supported) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [supported, isPlaying]);

  useEffect(() => {
    if (!supported) return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (!Number.isFinite(currentTime)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(duration, Math.max(0, currentTime)),
      });
    } catch {
      // Position outside the last known duration mid-seek — ignore
    }
  }, [supported, duration, Math.round(currentTime)]);
}
