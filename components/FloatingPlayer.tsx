"use client";

import { memo, useEffect, useRef } from "react";
import gsap from "gsap";
import { ListMusic } from "lucide-react";
import type { Track } from "@/data/types";
import { AlbumArt } from "@/components/AlbumArt";
import { ProgressBar } from "@/components/player/ProgressBar";
import { TransportControls } from "@/components/player/TransportControls";
import { VolumeControl } from "@/components/player/VolumeControl";
import { TrackInfo } from "@/components/player/TrackInfo";
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
  locked?: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleQueue?: () => void;
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
    if (!trackInfoRef.current || !artRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        trackInfoRef.current!,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
      );
      gsap.fromTo(
        artRef.current!,
        { scale: 0.9, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.5)" },
      );
    });
    return () => ctx.revert();
  }, [track.id]);

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-[max(2rem,env(safe-area-inset-bottom))] select-none",
        className,
      )}
    >
      <div
        className={cn(
          "w-full max-w-md sm:max-w-lg md:max-w-xl rounded-2xl border border-white/10 bg-black/45 p-3.5 sm:p-4 md:p-5 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300",
        )}
      >
        <div className="mb-3 flex items-center gap-3.5">
          <div ref={artRef}>
            <AlbumArt src={track.cover} title={track.title} accent={accent} size="md" />
          </div>
          <div ref={trackInfoRef} className="min-w-0 flex-1">
            <TrackInfo title={track.title} artist={track.artist} />
          </div>
        </div>

        <div className="mb-1">
          <ProgressBar
            progress={progress}
            currentTime={currentTime}
            duration={duration}
            accent={accent}
            onSeek={onSeek}
          />
        </div>

        <div className="mb-3 flex justify-between text-[10px] tabular-nums font-mono text-white/40">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between">
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            accent={accent}
            size="sm"
            sliderClassName="hidden sm:block"
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />

          <TransportControls
            isPlaying={isPlaying}
            disabled={locked}
            accent={accent}
            size="sm"
            onTogglePlay={onTogglePlay}
            onPrev={onPrev}
            onNext={onNext}
          />

          <div className="flex items-center gap-2 justify-end sm:w-20">
            {onToggleQueue && (
              <button
                type="button"
                onClick={onToggleQueue}
                className="relative rounded-full p-2 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Open queue"
              >
                <ListMusic className="h-4 w-4" />
                {queueCount != null && queueCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/20 px-1 text-[8px] font-medium text-white/70">
                    {queueCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
