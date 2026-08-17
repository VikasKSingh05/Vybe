"use client";

import { useState } from "react";
import {
  Radio,
  Copy,
  Check,
  Share2,
  Crown,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface RoomCodeCardProps {
  roomId: string;
  isHost: boolean;
  accent: string;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
}

export function RoomCodeCard({
  roomId,
  isHost,
  accent,
  isPlaying,
  volume,
  isMuted,
  onTogglePlay,
  onPrev,
  onNext,
  onVolumeChange,
  onToggleMute,
}: RoomCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const handleShare = async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/party/${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my VYBE Party", url });
      } catch {
        // user cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="h-full flex flex-col justify-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
      {/* Room code section */}
      <div className="flex flex-col items-center px-6 pb-6 text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
          style={{
            backgroundColor: accent,
            boxShadow: `0 8px 32px ${accent}44`,
          }}
        >
          <Radio className="h-7 w-7 text-black" />
        </div>
        <p className="mb-1 text-[10px] tracking-widest text-white/40 uppercase">
          Room Code
        </p>
        <p className="font-mono text-2xl font-bold tracking-[0.3em] text-white">
          {roomId.toUpperCase().split("").join(" ")}
        </p>
        <p className="mt-2 text-xs text-white/35">
          Share this code with friends
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5 px-5 pb-5">
        <button
          type="button"
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-black transition-all duration-200 hover:brightness-110 active:scale-[0.98] cursor-pointer"
          style={{ backgroundColor: accent }}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy code
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share invite
        </button>
      </div>

      {/* Divider */}
      <div className="mx-5 my-8 h-px bg-white/10" />

      {/* Host section */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="h-4 w-4" style={{ color: accent }} />
          <span className="text-[11px] font-semibold tracking-wide text-white/80 uppercase">
            {isHost ? "You're the host" : "Host controls"}
          </span>
        </div>
        {isHost ? (
          <p className="text-[11px] text-white/35 mb-4">
            You control playback for everyone in the room.
          </p>
        ) : (
          <p className="text-[11px] text-white/35 mb-4">
            Only the host can control playback.
          </p>
        )}

        {/* Host controls */}
        {isHost ? (
          <div className="flex flex-col gap-4">
            {/* Transport */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onPrev}
                className="rounded-full p-2 text-white/50 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
              >
                <SkipBack className="h-4 w-4 fill-current" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="rounded-full p-3.5 text-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 4px 24px ${accent}66`,
                }}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current pl-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={onNext}
                className="rounded-full p-2 text-white/50 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </button>
            </div>

            {/* Shuffle / Repeat */}
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                className="rounded-full p-2 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60 cursor-pointer"
                title="Shuffle (coming soon)"
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60 cursor-pointer"
                title="Repeat (coming soon)"
              >
                <Repeat className="h-4 w-4" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80 cursor-pointer"
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
                className="volume-slider flex-1"
                style={{ "--accent": accent } as React.CSSProperties}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/30">
            Ask the host to control playback
          </div>
        )}
      </div>
    </div>
  );
}
