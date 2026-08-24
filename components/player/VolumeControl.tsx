"use client";

import { Volume2, VolumeX } from "lucide-react";

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  accent: string;
  size?: "sm" | "md";
  /** Extra classes for the range input, e.g. responsive hiding on narrow screens. */
  sliderClassName?: string;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export function VolumeControl({
  volume,
  isMuted,
  accent,
  size = "md",
  sliderClassName,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const isSmall = size === "sm";

  return (
    <div className={`flex items-center ${isSmall ? "gap-1.5" : "gap-2"}`}>
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
        className={`rounded-full transition-colors duration-200 hover:bg-white/10 hover:text-white/80 cursor-pointer ${
          isSmall ? "p-2.5 text-white/40 min-h-[44px] min-w-[44px] flex items-center justify-center" : "p-2 text-white/50 hover:text-white/90"
        }`}
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
        className={`volume-slider ${isSmall ? "w-16" : "w-24"} ${sliderClassName ?? ""}`}
        style={{ "--accent": accent } as React.CSSProperties}
      />
    </div>
  );
}
