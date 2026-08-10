"use client";

import { cn } from "@/lib/cn";

interface NowPlayingBadgeProps {
  title: string;
  artist: string;
  isPlaying: boolean;
  accent: string;
  trackKey: string;
  className?: string;
}

export function NowPlayingBadge({
  title,
  artist,
  isPlaying,
  accent,
  trackKey,
  className,
}: NowPlayingBadgeProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center px-6 pt-2 pb-4 text-center",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full transition-all duration-500",
            isPlaying ? "animate-pulse-soft" : "opacity-40",
          )}
          style={{ backgroundColor: isPlaying ? accent : "rgba(255,255,255,0.4)" }}
        />
        <span className="text-[9px] font-medium tracking-[0.25em] text-white/40 uppercase">
          {isPlaying ? "Now Playing" : "Paused"}
        </span>
      </div>

      <div
        key={trackKey}
        className="animate-fade-in w-full"
      >
        <p className="truncate text-sm font-medium tracking-wide text-white/90">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs tracking-wide text-white/45">
          {artist}
        </p>
      </div>
    </div>
  );
}
