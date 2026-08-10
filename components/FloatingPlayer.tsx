"use client";

import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useRef } from "react";
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

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      onSeek(ratio * duration);
    },
    [duration, onSeek],
  );

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-40 flex justify-center px-4 pb-5 md:px-6 md:pb-8",
        className,
      )}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-2xl border border-white/8 bg-black/45 p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md",
          "sm:p-4 md:max-w-xl md:p-5",
        )}
      >
        {/* Track info row */}
        <div className="mb-4 flex items-center gap-3.5">
          <AlbumArt
            src={track.cover}
            title={track.title}
            accent={track.accent}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white/95">
              {track.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-white/45">
              {track.artist}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-1">
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
            className="group relative h-1 cursor-pointer rounded-full bg-white/10 transition-all hover:h-1.5"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: accent,
                boxShadow: `0 0 12px ${accent}66`,
              }}
            />
            <div
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
              style={{ left: `calc(${progress}% - 5px)` }}
            />
          </div>
        </div>

        <div className="mb-4 flex justify-between text-[10px] tabular-nums text-white/35">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="rounded-full p-2 text-white/40 transition-all duration-200 hover:bg-white/8 hover:text-white/70"
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

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous track"
              className="rounded-full p-2.5 text-white/50 transition-all duration-200 hover:translate-x-[-1px] hover:bg-white/8 hover:text-white/85 active:scale-95"
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="rounded-full p-3.5 text-white transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: `${accent}cc`,
                boxShadow: `0 4px 20px ${accent}44`,
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
              className="rounded-full p-2.5 text-white/50 transition-all duration-200 hover:translate-x-[1px] hover:bg-white/8 hover:text-white/85 active:scale-95"
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </button>
          </div>

          <div className="w-[72px]" aria-hidden />
        </div>
      </div>
    </div>
  );
}
