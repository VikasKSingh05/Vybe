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
    <div className="flex items-center gap-1 sm:gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled}
        aria-label="Previous track"
        className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full p-2.5 text-paper/45 transition-all hover:scale-105 hover:bg-paper/10 hover:text-paper active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-transparent"
      >
        <SkipBack className={`${isSmall ? "h-4 w-4" : "h-5 w-5"} fill-current`} />
      </button>

      <button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={isPlaying ? "Pause" : "Play"}
        className={`grid place-items-center rounded-full text-ink transition-all hover:scale-105 hover:shadow-[0_0_0_7px_rgba(255,107,61,0.14)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none ${
          isSmall ? "h-11 w-11" : "h-14 w-14"
        }`}
        style={{ backgroundColor: disabled ? "rgba(244,239,230,0.18)" : accent }}
      >
        {isPlaying ? (
          <Pause className={`${isSmall ? "h-4 w-4" : "h-5 w-5"} fill-current`} />
        ) : (
          <Play className={`${isSmall ? "h-4 w-4" : "h-5 w-5"} fill-current pl-0.5`} />
        )}
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        aria-label="Next track"
        className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full p-2.5 text-paper/45 transition-all hover:scale-105 hover:bg-paper/10 hover:text-paper active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-transparent"
      >
        <SkipForward className={`${isSmall ? "h-4 w-4" : "h-5 w-5"} fill-current`} />
      </button>
    </div>
  );
}
