"use client";

import { Video } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-4 h-4 text-red-500", className)}
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

interface YouTubePlayerProps {
  videoId?: string;
  title?: string;
  isPlaying?: boolean;
  accent?: string;
  className?: string;
}

export function YouTubePlayer({
  videoId = "placeholder_vid_id",
  title = "VYBE Audio Stream",
  isPlaying = false,
  accent = "#e07a3a",
  className,
}: YouTubePlayerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative inline-block select-none", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="YouTube Player Integration Placeholder"
        title="YouTube Player Ready (Placeholder)"
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide uppercase transition-all duration-300 cursor-pointer",
          "border border-white/10 bg-black/40 text-white/60 hover:border-white/25 hover:bg-black/60 hover:text-white/90",
        )}
      >
        <YoutubeIcon className="h-3 w-3 text-red-500" />
        <span className="hidden sm:inline">YouTube Player</span>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isPlaying ? "animate-pulse bg-emerald-400" : "bg-white/30",
          )}
        />
      </button>

      {/* Placeholder Modal / Flyout when clicked */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-3 w-72 rounded-xl border border-white/15 bg-black/85 p-3.5 shadow-2xl backdrop-blur-xl z-50 text-left transition-all animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <YoutubeIcon className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-white/90">
                YouTube Player Embed
              </span>
            </div>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white/50">
              Placeholder
            </span>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-900 border border-white/10 flex flex-col items-center justify-center p-3 text-center">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(circle at center, ${accent} 0%, transparent 70%)`,
              }}
            />
            <YoutubeIcon className="h-8 w-8 text-white/40 mb-1.5" />
            <p className="text-[11px] font-medium text-white/80 truncate max-w-[200px]">
              {title}
            </p>
            <p className="text-[9px] text-white/40 mt-0.5 font-mono">
              ID: {videoId}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isPlaying ? "bg-emerald-400 animate-ping" : "bg-amber-400",
                )}
              />
              <span className="text-[10px] text-white/60">
                {isPlaying ? "Sync Active" : "Paused"}
              </span>
            </div>
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-white/40">
            Official YouTube IFrame API integration slot ready.
          </p>
        </div>
      )}
    </div>
  );
}

export default YouTubePlayer;
