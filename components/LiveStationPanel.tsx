"use client";

import Link from "next/link";
import {
  ArrowUpRight,
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
    };
  }

  if (status === "unavailable") {
    return { label: "OFFLINE", tone: "offline" };
  }

  if (status === "recovering") {
    return { label: "RECONNECTING", tone: "pending" };
  }

  if (status === "loading" || !status || (isSyncing && !hasCurrentTrack)) {
    return { label: "TUNING IN", tone: "pending" };
  }

  return { label: "LIVE", tone: "live" };
}

const TONE_STYLES: Record<
  StatusTone,
  { dot: string; text: string; shell: string }
> = {
  live: {
    dot: "bg-mint shadow-[0_0_10px_rgba(158,230,180,0.85)]",
    text: "text-mint",
    shell: "border-mint/30 bg-mint/10",
  },
  pending: {
    dot: "bg-ember shadow-[0_0_10px_rgba(255,154,107,0.75)]",
    text: "text-ember",
    shell: "border-ember/30 bg-ember/10",
  },
  offline: {
    dot: "bg-signal shadow-[0_0_10px_rgba(255,107,61,0.8)]",
    text: "text-signal",
    shell: "border-signal/40 bg-signal/10",
  },
};

function Equalizer({ accent }: { accent: string }) {
  return (
    <div className="flex h-4 items-end gap-[3px]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="eq-bar w-[2px] rounded-full"
          style={{ backgroundColor: accent }}
        />
      ))}
    </div>
  );
}

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
      aria-label="Live broadcast"
      className={cn("w-full", className)}
    >
      {/* Transmission header */}
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-paper/10 pb-3">
        <div className="flex items-center gap-3">
          <span className="signal-line h-px w-5 bg-signal/50" />
          <p className="mono-label text-paper/35">Transmission / 001</p>
        </div>
        <div
          aria-live="polite"
          className={cn(
            "mono-label inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5",
            tone.shell,
            tone.text,
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              tone.dot,
              view.tone === "live" && "live-pulse",
            )}
          />
          {view.label}
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:gap-9">
        {/* Artwork stage */}
        <div className="relative min-w-0">
          <div className="absolute -top-3 -left-3 h-9 w-9 border-t border-l border-signal/70" />
          <div className="absolute -right-3 -bottom-3 h-9 w-9 border-r border-b border-paper/20" />

          <div className="artwork-stage relative overflow-hidden rounded-[28px] border border-paper/10 bg-ink-soft shadow-[0_28px_80px_-32px_rgba(0,0,0,0.95)]">
            <AlbumArt
              src={track.cover}
              title={hasCurrentTrack ? track.title : "VYBE LIVE"}
              accent={accent}
              size="lg"
              className="aspect-square h-auto w-full rounded-[28px] sm:aspect-[5/4] lg:aspect-auto lg:h-[min(44vh,420px)]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-5">
              <div className="flex h-6 items-center gap-2.5">
                {isPlaying && hasCurrentTrack ? (
                  <Equalizer accent={accent} />
                ) : null}
                <span className="mono-label text-paper/60">
                  {hasCurrentTrack ? "On air" : "Standby"}
                </span>
              </div>

              <button
                type="button"
                onClick={onTogglePlay}
                disabled={!hasCurrentTrack}
                aria-label={isPlaying ? "Pause broadcast" : "Play broadcast"}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-signal text-ink shadow-[0_10px_30px_rgba(255,107,61,0.35)] transition-all hover:scale-105 hover:shadow-[0_10px_30px_rgba(255,107,61,0.45),0_0_0_8px_rgba(255,107,61,0.12)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current pl-0.5" />
                )}
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              {hasCurrentTrack ? (
                <>
                  <span className="mb-3 block h-px w-8 bg-signal" />
                  <h2 className="font-display text-3xl leading-[1.02] font-bold tracking-[-0.04em] text-paper sm:text-4xl">
                    {track.title}
                  </h2>
                  <p className="mt-2 text-sm text-paper/60">{track.artist}</p>
                </>
              ) : (
                <div aria-live="polite">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-paper/10" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-paper/5" />
                  <p className="mono-label mt-4 text-paper/50">Tuning in…</p>
                </div>
              )}
            </div>
          </div>

          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-signal/40 bg-signal/10 px-4 py-2.5 text-xs text-signal transition-colors hover:bg-signal/20"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </button>
          ) : null}
        </div>

        {/* Station rail */}
        <aside className="flex min-w-0 flex-col gap-5 lg:border-l lg:border-paper/10 lg:pl-8">
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
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
              <ol className="divide-y divide-paper/10 border-y border-paper/10">
                {upNext.map((item, index) => (
                  <li
                    key={item.queueItemId}
                    className="queue-row flex items-center gap-3 py-2.5"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
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
              <div className="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-paper/15 px-4 text-center">
                <ListMusic className="h-5 w-5 text-paper/25" />
                <p className="mono-label text-paper/40">Nothing queued</p>
              </div>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <div className="w-full">{searchOverlay}</div>
            <Link
              href="/party"
              className="group flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-paper/12 bg-paper/[0.03] px-4 transition-colors hover:border-signal/40 hover:bg-signal/[0.06]"
            >
              <span className="flex items-center gap-3">
                <Users className="h-4 w-4" style={{ color: accent }} />
                <span>
                  <span className="block text-sm font-medium text-paper/90">
                    VYBE Jam
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
