"use client";

import { memo, useEffect, useRef } from "react";
import { ListMusic } from "lucide-react";
import type { Track } from "@/data/types";
import { AlbumArt } from "@/components/AlbumArt";
import { ProgressBar } from "@/components/player/ProgressBar";
import { TransportControls } from "@/components/player/TransportControls";
import { VolumeControl } from "@/components/player/VolumeControl";
import { TrackInfo } from "@/components/player/TrackInfo";
import { prefersReducedMotion } from "@/lib/motion";
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
  queueCount?: number;
  /** Optional source label, e.g. "LIVE". */
  broadcastLabel?: string;
  locked?: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleQueue?: () => void;
  onToggleSettings?: () => void;
  className?: string;
}

export const FloatingPlayer = memo(function FloatingPlayer({
  track,
  isPlaying,
  currentTime,
  duration,
  progress,
  volume,
  isMuted,
  accent,
  queueCount,
  broadcastLabel,
  locked = false,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleQueue,
  className,
}: FloatingPlayerProps) {
  const trackInfoRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const info = trackInfoRef.current;
    const art = artRef.current;
    if (!info || !art || prefersReducedMotion()) return;
    const infoAnim = info.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 450, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
    );
    const artAnim = art.animate(
      [
        { opacity: 0.7, transform: "scale(0.9)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 450, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
    return () => {
      infoAnim.cancel();
      artAnim.cancel();
    };
  }, [track.id]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] select-none",
        className,
      )}
    >
      <div className="relative w-full max-w-3xl overflow-hidden rounded-t-[26px] border border-paper/10 bg-ink/90 shadow-[0_-12px_60px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:rounded-[26px]">
        <div
          className="absolute inset-x-0 top-0 h-px opacity-70"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
          }}
        />

        <div className="px-4 pt-3 pb-3 sm:px-5 sm:pt-4 sm:pb-4">
          <ProgressBar
            progress={progress}
            currentTime={currentTime}
            duration={duration}
            accent={accent}
            onSeek={onSeek}
          />
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-paper/35">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="flex min-w-0 items-center gap-3">
              <div
                ref={artRef}
                className="shrink-0 transition-transform duration-500 hover:scale-105"
              >
                <AlbumArt
                  src={track.cover}
                  title={track.title}
                  accent={accent}
                  size="md"
                  className="h-11 w-11 rounded-lg sm:h-12 sm:w-12"
                />
              </div>
              <div ref={trackInfoRef} className="min-w-0 flex-1">
                {broadcastLabel ? (
                  <p
                    className="mono-label mb-1 flex items-center gap-1.5"
                    style={{ color: accent }}
                  >
                    <span className="h-1 w-1 rounded-full bg-current" />
                    {broadcastLabel}
                  </p>
                ) : null}
                <TrackInfo title={track.title} artist={track.artist} size="sm" />
              </div>
            </div>

            <TransportControls
              isPlaying={isPlaying}
              disabled={locked}
              accent={accent}
              size="sm"
              onTogglePlay={onTogglePlay}
              onPrev={onPrev}
              onNext={onNext}
            />

            <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:justify-end sm:gap-1">
              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                accent={accent}
                size="sm"
                onVolumeChange={onVolumeChange}
                onToggleMute={onToggleMute}
              />
              {onToggleQueue ? (
                <button
                  type="button"
                  onClick={onToggleQueue}
                  className="relative ml-1 grid min-h-[44px] min-w-[44px] place-items-center rounded-full p-2 text-paper/40 transition-colors hover:bg-paper/10 hover:text-paper"
                  aria-label="Open queue"
                >
                  <ListMusic className="h-4 w-4" />
                  {queueCount != null && queueCount > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-signal px-1 font-mono text-[8px] font-semibold text-ink">
                      {queueCount}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
