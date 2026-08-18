"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

interface TransportControlsProps {
  isPlaying: boolean;
  disabled: boolean;
  accent: string;
  size?: "sm" | "md";
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function TransportControls({
  isPlaying,
  disabled,
  accent,
  size = "md",
  onTogglePlay,
  onPrev,
  onNext,
}: TransportControlsProps) {
  const isSmall = size === "sm";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled}
        aria-label="Previous track"
        className={`rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-transparent cursor-pointer ${
          isSmall
            ? "p-2 text-white/50"
            : "p-2.5 text-white/60"
        }`}
      >
        <SkipBack className={`${isSmall ? "h-4 w-4" : "h-5 h-5"} fill-current`} />
      </button>

      <button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={isPlaying ? "Pause" : "Play"}
        className={`rounded-full text-white transition-all duration-200 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shadow-lg ${
          isSmall ? "p-3" : "p-4"
        }`}
        style={{
          backgroundColor: disabled ? "rgba(255,255,255,0.12)" : accent,
          boxShadow: `0 4px ${isSmall ? "20px" : "24px"} ${
            disabled ? "rgba(255,255,255,0.05)" : `${accent}55`
          }`,
        }}
      >
        {isPlaying ? (
          <Pause className={`${isSmall ? "h-5 w-5" : "h-6 w-6"} fill-current`} />
        ) : (
          <Play className={`${isSmall ? "h-5 w-5" : "h-6 w-6"} fill-current pl-0.5`} />
        )}
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        aria-label="Next track"
        className={`rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-transparent cursor-pointer ${
          isSmall
            ? "p-2 text-white/50"
            : "p-2.5 text-white/60"
        }`}
      >
        <SkipForward className={`${isSmall ? "h-4 w-4" : "h-5 h-5"} fill-current`} />
      </button>
    </div>
  );
}
