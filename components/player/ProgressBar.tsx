"use client";

import { useCallback, useRef } from "react";

interface ProgressBarProps {
  progress: number;
  currentTime: number;
  duration: number;
  accent: string;
  onSeek: (time: number) => void;
}

export function ProgressBar({
  progress,
  currentTime,
  duration,
  accent,
  onSeek,
}: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek],
  );

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      tabIndex={0}
      onClick={handleClick}
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
}
