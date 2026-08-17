"use client";

import { useCallback, useEffect, useRef } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import gsap from "gsap";
import type { Track } from "@/data/types";
import type { PartyReaction, PartyState } from "@/lib/party/types";
import { AlbumArt } from "@/components/AlbumArt";
import { Equalizer } from "./Equalizer";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/cn";

interface NowPlayingCardProps {
  track: Track | null;
  state: PartyState | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  isHost: boolean;
  accent: string;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onReact: (emoji: string) => void;
}

const REACTION_EMOJIS = ["🔥", "❤️", "🎉", "💯", "👏"] as const;

export function NowPlayingCard({
  track,
  state,
  isPlaying,
  currentTime,
  duration,
  progress,
  isHost,
  accent,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onReact,
}: NowPlayingCardProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Animate track change
  useEffect(() => {
    if (!infoRef.current) return;
    gsap.fromTo(infoRef.current, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
    if (artRef.current) {
      gsap.fromTo(artRef.current, { scale: 0.92, opacity: 0.7 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.4)" });
    }
  }, [track?.id]);

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

  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Reaction counts from state
  const reactionCounts: Record<string, number> = {};
  const now = Date.now();
  (state?.reactions ?? []).forEach((r: PartyReaction) => {
    if (now - r.at < 30_000) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    }
  });

  const memberCount = state?.members.length ?? 0;

  if (!track) {
    return (
      <div className="shrink-0 rounded-2xl border border-white/10 bg-black/40 p-10 text-center backdrop-blur-xl">
        <p className="text-sm text-white/40">
          No tracks in the queue. Add a track to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
        <p className="text-[10px] tracking-widest text-white/40 uppercase">
          Now Playing
        </p>
        {isPlaying && <Equalizer isPlaying={isPlaying} accent={accent} />}
      </div>

      <div className="p-4">
        {/* Album art + track info */}
        <div className="flex gap-4 mb-3">
          <div
            ref={artRef}
            className="shrink-0"
            style={{
              filter: isPlaying ? `drop-shadow(0 0 20px ${accent}44)` : undefined,
            }}
          >
            <AlbumArt
              src={track.cover}
              title={track.title}
              accent={accent}
              size="lg"
            />
          </div>

          <div ref={infoRef} className="min-w-0 flex-1 flex flex-col justify-center">
            <p className="truncate text-lg font-semibold text-white/95 tracking-tight">
              {track.title}
            </p>
            <p className="mt-1 truncate text-sm text-white/55">
              {track.artist}
            </p>

            {/* Status pills */}
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Playing
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/40">
                ✓ In sync
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-1.5">
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
        </div>

        {/* Time display */}
        <div className="mb-2 flex justify-between text-[10px] tabular-nums font-mono text-white/40">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onPrev}
            disabled={!isHost}
            aria-label="Previous track"
            className="rounded-full p-2.5 text-white/50 transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-transparent cursor-pointer"
          >
            <SkipBack className="h-5 w-5 fill-current" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!isHost}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="rounded-full p-4 text-white transition-all duration-200 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shadow-lg"
            style={{
              backgroundColor: isHost ? accent : "rgba(255,255,255,0.12)",
              boxShadow: `0 4px 24px ${isHost ? `${accent}55` : "rgba(255,255,255,0.03)"}`,
            }}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current pl-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!isHost}
            aria-label="Next track"
            className="rounded-full p-2.5 text-white/50 transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-transparent cursor-pointer"
          >
            <SkipForward className="h-5 w-5 fill-current" />
          </button>
        </div>
      </div>

      {/* Reactions strip */}
      <div className="border-t border-white/[0.06] px-5 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] tracking-widest text-white/35 uppercase">
            Reactions
          </p>
          <p className="text-[10px] text-white/30">
            {memberCount} {memberCount === 1 ? "person" : "people"} listening
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {REACTION_EMOJIS.map((emoji) => {
            const count = reactionCounts[emoji] ?? 0;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer",
                  count > 0
                    ? "border-white/15 bg-white/10"
                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.07]",
                )}
              >
                <span className="leading-none">{emoji}</span>
                {count > 0 && (
                  <span className="text-[10px] tabular-nums text-white/50">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
