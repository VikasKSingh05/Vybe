"use client";

import { memo, useEffect, useRef } from "react";
import gsap from "gsap";
import type { Track } from "@/data/types";
import type { PartyReaction, PartyState } from "@/lib/party/types";
import { PARTY_EMOJIS } from "@/lib/party/types";
import { AlbumArt } from "@/components/AlbumArt";
import { Equalizer } from "./Equalizer";
import { ReactionBurst } from "./ReactionBurst";
import { ProgressBar } from "@/components/player/ProgressBar";
import { TransportControls } from "@/components/player/TransportControls";
import { TrackInfo } from "@/components/player/TrackInfo";
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

export const NowPlayingCard = memo(function NowPlayingCard({
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
  const artRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoRef.current || !artRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(infoRef.current!, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
      gsap.fromTo(artRef.current!, { scale: 0.92, opacity: 0.7 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.4)" });
    });
    return () => ctx.revert();
  }, [track?.id]);

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
    <div className="shrink-0 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden" aria-live="polite">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
        <p className="text-[10px] tracking-widest text-white/40 uppercase">
          Now Playing
        </p>
        {isPlaying && <Equalizer isPlaying={isPlaying} accent={accent} />}
      </div>

      <div className="p-4">
        <div className="flex gap-4 mb-3">
          <div
            ref={artRef}
            className="shrink-0"
            style={{
              filter: isPlaying ? `drop-shadow(0 0 20px ${accent}44)` : undefined,
            }}
          >
            <AlbumArt src={track.cover} title={track.title} accent={accent} size="lg" />
          </div>

          <div ref={infoRef} className="min-w-0 flex-1 flex flex-col justify-center">
            <TrackInfo title={track.title} artist={track.artist} size="lg" />
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Playing
              </span>
            </div>
          </div>
        </div>

        <div className="mb-1.5">
          <ProgressBar
            progress={progress}
            currentTime={currentTime}
            duration={duration}
            accent={accent}
            onSeek={onSeek}
          />
        </div>

        <div className="mb-2 flex justify-between text-[10px] tabular-nums font-mono text-white/40">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center">
          <span
            title={isHost ? undefined : "Only the host can control playback"}
            className="inline-flex"
          >
            <TransportControls
              isPlaying={isPlaying}
              disabled={!isHost}
              accent={accent}
              onTogglePlay={onTogglePlay}
              onPrev={onPrev}
              onNext={onNext}
            />
          </span>
        </div>
      </div>

      <div className="relative border-t border-white/[0.06] px-5 py-2.5">
        <ReactionBurst reactions={state?.reactions ?? []} />
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] tracking-widest text-white/35 uppercase">
            Reactions
          </p>
          <p className="text-[10px] text-white/45">
            {memberCount} {memberCount === 1 ? "person" : "people"} listening
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PARTY_EMOJIS.map((emoji) => {
            const count = reactionCounts[emoji] ?? 0;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                aria-label={`React with ${emoji}`}
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
})
