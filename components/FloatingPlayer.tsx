"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
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
  locked?: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  className?: string;
}

export function FloatingPlayer({
  track,
  isPlaying,
  currentTime,
  duration,
  progress,
  volume,
  isMuted,
  accent,
  locked = false,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  className,
}: FloatingPlayerProps) {
  const trackInfoRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackInfoRef.current) return;

    gsap.fromTo(
      trackInfoRef.current,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
    );

    if (artRef.current) {
      gsap.fromTo(
        artRef.current,
        { scale: 0.9, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.5)" },
      );
    }
  }, [track.id]);

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-40 flex justify-center px-4 pb-4 sm:pb-6 md:pb-8 select-none",
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

          <div className="hidden sm:block w-20" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
