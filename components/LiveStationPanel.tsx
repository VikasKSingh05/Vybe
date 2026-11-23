"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ListMusic,
  RotateCw,
  Users,
} from "lucide-react";
import { AlbumArt } from "@/components/AlbumArt";
import type { QueueItem, Track } from "@/data/types";
import type { StationHealth } from "@/lib/radio/types";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/cn";

type StatusLabel = "ON AIR" | "TUNING IN" | "RECONNECTING" | "OFFLINE";

interface LiveStationPanelProps {
  track: Track;
  status: StationHealth | null;
  isSyncing: boolean;
  hasCurrentTrack: boolean;
  queue: QueueItem[];
  accent: string;
  searchOverlay: React.ReactNode;
  onRetry: () => void;
  onOpenQueue: () => void;
  className?: string;
}

const STATUS_COLORS: Record<StatusLabel, string> = {
  "ON AIR": "text-mint",
  "TUNING IN": "text-ember",
  RECONNECTING: "text-ember",
  OFFLINE: "text-signal",
};

function resolveStatus(
  status: StationHealth | null,
  isSyncing: boolean,
  hasCurrentTrack: boolean,
): StatusLabel {
  if (!hasCurrentTrack) {
    return status === "unavailable" ? "OFFLINE" : "TUNING IN";
  }
  if (status === "unavailable") return "OFFLINE";
  if (status === "recovering") return "RECONNECTING";
  if (status === "loading" || !status || isSyncing) return "TUNING IN";
  return "ON AIR";
}

export function LiveStationPanel({
  track,
  status,
  isSyncing,
  hasCurrentTrack,
  queue,
  accent,
  searchOverlay,
  onRetry,
  onOpenQueue,
  className,
}: LiveStationPanelProps) {
  const label = resolveStatus(status, isSyncing, hasCurrentTrack);
  const upNext = queue.slice(1, 4);
  const canRetry = label === "OFFLINE";

  return (
    <section aria-label="Live broadcast" className={cn("w-full", className)}>
      {/* Single, quiet status line — no duplicate brand or live badge. */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-paper/10 pb-4">
        <p className="mono-label text-paper/40">Global radio / 001</p>
        <div className="flex items-center gap-4">
          <span
            aria-live="polite"
            className={cn("mono-label", STATUS_COLORS[label])}
          >
            {label}
          </span>
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-signal/40 px-3 text-xs text-signal transition-colors hover:bg-signal/10"
            >
              <RotateCw className="h-3 w-3" />
              Retry
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:gap-12">
        {/* Stage */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-[28px] border border-paper/10 bg-ink-soft shadow-[0_28px_80px_-32px_rgba(0,0,0,0.95)] transition-colors duration-300 hover:border-paper/20">
            <AlbumArt
              src={track.cover}
              title={hasCurrentTrack ? track.title : "Radio"}
              accent={accent}
              size="lg"
              className="aspect-square h-auto w-full rounded-[28px]"
            />
          </div>

          {/* The track is the display moment. */}
          <div className="mt-7 min-w-0">
            <p className="mono-label mb-3 text-paper/40">Now playing</p>
            {hasCurrentTrack ? (
              <>
                <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-bold tracking-[-0.045em] text-paper">
                  {track.title}
                </h1>
                <p className="mt-2 text-sm text-paper/55">{track.artist}</p>
              </>
            ) : (
              <div aria-live="polite">
                <div className="h-8 w-3/4 animate-pulse rounded bg-paper/10" />
                <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-paper/5" />
                <p className="mt-4 text-xs text-paper/50">Tuning in…</p>
              </div>
            )}
          </div>
        </div>

        {/* Rail */}
        <aside className="flex min-w-0 flex-col gap-7 lg:border-l lg:border-paper/10 lg:pl-10">
          <div>
            <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-paper/10 pb-3">
              <p className="mono-label text-paper/40">Up next</p>
              <button
                type="button"
                onClick={onOpenQueue}
                className="group flex min-h-[32px] items-center gap-1.5 text-xs text-paper/55 transition-colors hover:text-paper"
              >
                Full queue
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>

            {upNext.length > 0 ? (
              <ol className="divide-y divide-paper/10">
                {upNext.map((item, index) => (
                  <li key={item.queueItemId} className="flex items-center gap-3 py-3">
                    <span className="mono-label w-5 shrink-0 text-paper/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <AlbumArt
                      src={item.artwork}
                      title={item.title}
                      accent={accent}
                      size="sm"
                      className="h-10 w-10 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-paper/90">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-paper/45">{item.artist}</p>
                    </div>
                    {item.duration ? (
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-paper/30">
                        {formatTime(item.duration)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-paper/15 px-4 text-center">
                <ListMusic className="h-5 w-5 text-paper/25" />
                <p className="mono-label text-paper/40">Nothing queued</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="w-full">{searchOverlay}</div>
            <Link
              href="/party"
              className="group flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-paper/12 bg-paper/[0.03] px-4 transition-colors hover:border-signal/40 hover:bg-signal/[0.06]"
            >
              <span className="flex items-center gap-3">
                <Users className="h-4 w-4" style={{ color: accent }} />
                <span>
                  <span className="block text-sm font-medium text-paper/90">
                    Jam
                  </span>
                  <span className="mono-label mt-1 block text-paper/35">
                    Listen together
                  </span>
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-paper/35 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-signal" />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
