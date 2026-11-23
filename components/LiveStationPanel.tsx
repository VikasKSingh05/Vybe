"use client";

import { ListMusic } from "lucide-react";
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
  className,
}: LiveStationPanelProps) {
  const label = resolveStatus(status, isSyncing, hasCurrentTrack);
  const upNext = queue.slice(1, 4);
  const canRetry = label === "OFFLINE";

  return (
    <section
      aria-label="Live broadcast"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <div className="mb-5 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-paper/10 pb-3">
        <span className="signal-line h-px w-8 bg-signal/70" />
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
              className="inline-flex min-h-[32px] items-center rounded-full border border-signal/40 px-3 text-xs text-signal transition-colors hover:bg-signal/10"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] lg:gap-10">
        {/* Artwork — sized to the frame so the player can float over it. */}
        <div className="flex min-h-0 items-start">
          <div className="h-[min(26vh,220px)] w-[min(26vh,220px)] overflow-hidden rounded-[24px] border border-paper/10 bg-ink-soft shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] transition-colors duration-300 hover:border-paper/20 sm:h-[min(30vh,270px)] sm:w-[min(30vh,270px)] lg:h-[min(42vh,340px)] lg:w-[min(42vh,340px)]">
            <AlbumArt
              src={track.cover}
              title={hasCurrentTrack ? track.title : "Radio"}
              accent={accent}
              size="lg"
              className="h-full w-full rounded-[24px]"
            />
          </div>
        </div>

        {/* Rail */}
        <aside className="flex min-h-0 flex-col gap-4 lg:border-l lg:border-paper/10 lg:pl-9">
          <div className="shrink-0">
            <p className="mono-label mb-3 border-b border-paper/10 pb-3 text-paper/40">
              Up next
            </p>

            {upNext.length > 0 ? (
              <ol className="divide-y divide-paper/10">
                {upNext.map((item, index) => (
                  <li
                    key={item.queueItemId}
                    className={cn(
                      "flex items-center gap-3 py-2",
                      index === 2 && "hidden sm:flex",
                    )}
                  >
                    <span className="mono-label w-5 shrink-0 text-paper/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <AlbumArt
                      src={item.artwork}
                      title={item.title}
                      accent={accent}
                      size="sm"
                      className="h-9 w-9 rounded-lg"
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
              <div className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-paper/15 px-4 text-center">
                <ListMusic className="h-5 w-5 text-paper/25" />
                <p className="mono-label text-paper/40">Nothing queued</p>
              </div>
            )}
          </div>

          <div className="mt-auto shrink-0 pb-5 sm:pb-6">{searchOverlay}</div>
        </aside>
      </div>
    </section>
  );
}
