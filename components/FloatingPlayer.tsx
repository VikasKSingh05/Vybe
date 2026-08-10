"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import gsap from "gsap";
import type { Track } from "@/data/types";
import { AlbumArt } from "@/components/AlbumArt";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/cn";

interface FloatingPlayerProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  volume: number;
  isMuted: boolean;
  accent: string;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  className?: string;
}

export function FloatingPlayer({
  track,
  isPlaying,
  currentTime,
  duration,
  progress,
  volume,
  isMuted,
  accent,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  className,
}: FloatingPlayerProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const trackInfoRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);

  // GSAP animation when track changes
  useEffect(() => {
    if (!trackInfoRef.current) return;

    gsap.fromTo(
      trackInfoRef.current,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
    );

    if (artRef.current) {
      gsap.fromTo(
        artRef.current,
        { scale: 0.9, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.5)" },
      );
    }
  }, [track.id]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek],
  );

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-40 flex justify-center px-4 pb-4 sm:pb-6 md:pb-8 select-none",
        className,
      )}
    >
      <div
        className={cn(
          "w-full max-w-md sm:max-w-lg md:max-w-xl rounded-2xl border border-white/10 bg-black/45 p-3.5 sm:p-4 md:p-5 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300",
        )}
      >
        {/* Track info row */}
        <div className="mb-3 flex items-center gap-3.5">
          <div ref={artRef}>
            <AlbumArt
              src={track.cover}
              title={track.title}
              accent={accent}
              size="md"
            />
          </div>

          <div ref={trackInfoRef} className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white/95 tracking-tight">
              {track.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-white/50">
              {track.artist}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-1">
          {(() => {
            const clampedProgress = Math.min(100, Math.max(0, progress));
            return (
              <div
                ref={progressRef}
                role="slider"
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={currentTime}
                tabIndex={0}
                onClick={handleProgressClick}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") onSeek(Math.min(duration, currentTime + 5));
                  if (e.key === "ArrowLeft") onSeek(Math.max(0, currentTime - 5));
                }}
                className="group relative h-1.5 cursor-pointer rounded-full bg-white/10 overflow-hidden transition-all hover:h-2"
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-200 ease-out"
                  style={{
                    width: `${clampedProgress}%`,
                    backgroundColor: accent,
                    boxShadow: `0 0 10px ${accent}bb`,
                  }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                  style={{ left: `calc(${clampedProgress}% - 6px)` }}
                />
              </div>
            );
          })()}
        </div>

        {/* Timers */}
        <div className="mb-3 flex justify-between text-[10px] tabular-nums font-mono text-white/40">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-between">
          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="rounded-full p-2 text-white/50 transition-all duration-200 hover:bg-white/10 hover:text-white/90 cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label="Volume"
              className="volume-slider hidden w-16 sm:block"
              style={{ "--accent": accent } as React.CSSProperties}
            />
          </div>

          {/* Track Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous track"
              className="rounded-full p-2.5 text-white/60 transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="rounded-full p-3 text-white transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
              style={{
                backgroundColor: accent,
                boxShadow: `0 4px 20px ${accent}66`,
              }}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current pl-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              aria-label="Next track"
              className="rounded-full p-2.5 text-white/60 transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </button>
          </div>

          {/* Spacer for alignment on desktop */}
          <div className="hidden sm:block w-20" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
