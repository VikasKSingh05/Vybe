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
  const dragging = useRef(false);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      seekFromEvent(e.clientX);
    },
    [seekFromEvent],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      seekFromEvent(e.clientX);
    },
    [seekFromEvent],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      seekFromEvent(e.clientX);
    },
    [seekFromEvent],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek(Math.min(duration, currentTime + 5));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, currentTime - 5));
      }}
      className="group relative h-3 cursor-pointer rounded-full bg-white/10 overflow-hidden transition-all sm:h-2 sm:hover:h-3 touch-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75 ease-linear"
        style={{
          width: `${clampedProgress}%`,
          backgroundColor: accent,
          boxShadow: `0 0 10px ${accent}bb`,
        }}
      />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-md opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none max-sm:opacity-100"
        style={{ left: `calc(${clampedProgress}% - 6px)` }}
      />
    </div>
  );
}
