"use client";

import Link from "next/link";
import {
  ListMusic,
  Pause,
  Play,
  RotateCw,
  Users,
} from "lucide-react";
import { AlbumArt } from "@/components/AlbumArt";
import type { QueueItem, Track } from "@/data/types";
import type { StationHealth } from "@/lib/radio/types";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/cn";

type StatusTone = "live" | "pending" | "offline";

interface StatusView {
  label: string;
  tone: StatusTone;
  detail: string;
}

interface LiveStationPanelProps {
  track: Track;
  status: StationHealth | null;
  isSyncing: boolean;
  hasCurrentTrack: boolean;
  queue: QueueItem[];
  accent: string;
  isPlaying: boolean;
  searchOverlay: React.ReactNode;
  onRetry: () => void;
  onOpenQueue: () => void;
  onTogglePlay: () => void;
  className?: string;
}

function resolveStatus(
  status: StationHealth | null,
  isSyncing: boolean,
  hasCurrentTrack: boolean,
): StatusView {
  if (!hasCurrentTrack) {
    return {
      label: status === "unavailable" ? "OFFLINE" : "TUNING IN",
      tone: status === "unavailable" ? "offline" : "pending",
      detail:
        status === "unavailable"
          ? "The broadcast is temporarily unavailable."
          : "Connecting to the global broadcast…",
    };
  }

  if (status === "unavailable") {
    return {
      label: "OFFLINE",
      tone: "offline",
      detail: "The broadcast lost its source. Retrying is safe.",
    };
  }

  if (status === "recovering") {
    return {
      label: "RECONNECTING",
      tone: "pending",
      detail: "The station is finding the next track.",
    };
  }

  if (status === "loading" || !status || (isSyncing && !hasCurrentTrack)) {
    return {
      label: "TUNING IN",
      tone: "pending",
      detail: "Connecting to the global broadcast…",
    };
  }

  return {
    label: "LIVE",
    tone: "live",
    detail: "One station, shared with everyone listening right now.",
  };
}

const TONE_STYLES: Record<StatusTone, { dot: string; text: string; shell: string }> = {
  live: {
    dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]",
    text: "text-emerald-300",
    shell: "border-emerald-300/25 bg-emerald-300/10",
  },
  pending: {
    dot: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.7)]",
    text: "text-amber-200",
    shell: "border-amber-300/25 bg-amber-300/10",
  },
  offline: {
    dot: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.7)]",
    text: "text-rose-200",
    shell: "border-rose-300/25 bg-rose-300/10",
  },
};

export function LiveStationPanel({
  track,
  status,
  isSyncing,
  hasCurrentTrack,
  queue,
  accent,
  isPlaying,
  searchOverlay,
  onRetry,
  onOpenQueue,
  onTogglePlay,
  className,
}: LiveStationPanelProps) {
  const view = resolveStatus(status, isSyncing, hasCurrentTrack);
  const tone = TONE_STYLES[view.tone];
  const upNext = queue.slice(1, 4);
  const canRetry = view.tone !== "live" && view.tone !== "pending";

  return (
    <section
      aria-label="VYBE LIVE station"
      className={cn("w-full max-w-4xl", className)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <div
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[0.22em] uppercase",
            tone.shell,
            tone.text,
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              tone.dot,
              view.tone === "live" && "motion-safe:animate-pulse",
            )}
          />
          {view.label}
        </div>
        <p className="text-[11px] text-white/45">{view.detail}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium tracking-[0.28em] text-white/40 uppercase">
              Now playing
            </p>
            <span className="text-[10px] text-white/35">Shared live</span>
          </div>

          <div className="flex items-center gap-3.5 sm:gap-4">
            <AlbumArt
              src={track.cover}
              title={hasCurrentTrack ? track.title : "VYBE LIVE"}
              accent={accent}
              size="lg"
              className="h-20 w-20 rounded-xl sm:h-24 sm:w-24"
            />

            <div className="min-w-0 flex-1">
              {hasCurrentTrack ? (
                <>
                  <p className="truncate text-base font-semibold text-white sm:text-lg">
                    {track.title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-white/55">{track.artist}</p>
                  <p className="mt-2 text-[10px] tracking-[0.18em] text-white/35 uppercase">
                    VYBE LIVE
                  </p>
                </>
              ) : (
                <div aria-live="polite">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-white/5" />
                  <p className="mt-3 text-xs text-white/45">Tuning in to VYBE LIVE…</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!hasCurrentTrack}
              aria-label={isPlaying ? "Pause VYBE LIVE" : "Play VYBE LIVE"}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ boxShadow: `0 0 18px ${accent}44` }}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
          </div>

          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry connection
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/35 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium tracking-[0.28em] text-white/40 uppercase">
              Up next
            </p>
            <button
              type="button"
              onClick={onOpenQueue}
              className="flex min-h-[32px] items-center gap-1 text-[11px] text-white/45 transition hover:text-white/80"
            >
              Full queue
              <ListMusic className="h-3.5 w-3.5" />
            </button>
          </div>

          {upNext.length > 0 ? (
            <ol className="space-y-2">
              {upNext.map((item, index) => (
                <li
                  key={item.queueItemId}
                  className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.04] px-2.5 py-2"
                >
                  <span className="w-3 shrink-0 text-center text-[10px] tabular-nums text-white/30">
                    {index + 1}
                  </span>
                  <AlbumArt
                    src={item.artwork}
                    title={item.title}
                    accent={accent}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/85">
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-white/40">{item.artist}</p>
                  </div>
                  {item.duration ? (
                    <span className="shrink-0 text-[10px] tabular-nums text-white/30">
                      {formatTime(item.duration)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-[154px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 px-4 text-center">
              <ListMusic className="h-5 w-5 text-white/25" />
              <p className="text-xs text-white/45">
                {hasCurrentTrack
                  ? "More tracks are on the way."
                  : "The next tracks are loading."}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-lg">{searchOverlay}</div>
        <Link
          href="/party"
          className="flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-medium text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          <Users className="h-4 w-4" style={{ color: accent }} />
          VYBE Jam
          <span className="text-white/35">· listen together</span>
        </Link>
      </div>
    </section>
  );
}
