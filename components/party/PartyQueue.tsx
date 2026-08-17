"use client";

import { Music2, X, Settings } from "lucide-react";
import type { PartyState } from "@/lib/party/types";
import { AlbumArt } from "@/components/AlbumArt";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/cn";

interface PartyQueueProps {
  state: PartyState | null;
  isHost: boolean;
  memberId: string;
  accent: string;
  className?: string;
  onRemove: (queueId: string) => void;
}

export function PartyQueue({
  state,
  isHost,
  memberId,
  accent,
  className,
  onRemove,
}: PartyQueueProps) {
  const queue = state?.queue ?? [];

  return (
    <div className={cn("flex flex-col min-h-0 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl", className)}>
      <div className="shrink-0 flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <p className="text-[10px] tracking-widest text-white/40 uppercase">
          Up Next ({queue.length})
        </p>
        <button
          type="button"
          className="rounded-md p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60 cursor-pointer"
          title="Queue settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="shrink-0 flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Music2 className="h-6 w-6 text-white/20" />
          <p className="text-sm text-white/40">Queue is empty</p>
          <p className="text-xs text-white/25">
            Add tracks below to get the party started.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto scrollbar-hide">
          {queue.map((track, index) => {
            const isCurrent = state?.playback?.queueId === track.queueId;
            const canRemove = isHost || track.addedBy === memberId;
            return (
              <li
                key={track.queueId}
                className={cn(
                  "group flex items-center gap-3 px-4 py-2.5 sm:px-5 transition-colors",
                  isCurrent && "bg-orange-500/[0.06] border-l-2",
                  !isCurrent && "border-l-2 border-l-transparent",
                )}
                style={isCurrent ? { borderLeftColor: accent } : undefined}
              >
                <span
                  className="w-5 shrink-0 text-center text-[11px] tabular-nums text-white/25"
                  aria-hidden="true"
                >
                  {isCurrent ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                  ) : (
                    index + 1
                  )}
                </span>

                <AlbumArt
                  src={track.song.artwork}
                  title={track.song.title}
                  accent={accent}
                  size="sm"
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm",
                      isCurrent ? "text-white font-medium" : "text-white/80",
                    )}
                  >
                    {track.song.title}
                  </p>
                  <p className="truncate text-xs text-white/40">
                    {track.song.artist}
                  </p>
                </div>

                {/* Duration */}
                {track.song.duration != null && track.song.duration > 0 && (
                  <span className="shrink-0 text-[10px] tabular-nums font-mono text-white/25 hidden sm:inline">
                    {formatTime(track.song.duration)}
                  </span>
                )}

                {/* Added by */}
                <span className="shrink-0 text-[10px] text-white/25 hidden md:inline max-w-24 truncate">
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1" style={{ color: accent }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                      Playing now
                    </span>
                  ) : (
                    `by ${track.addedByName}`
                  )}
                </span>

                {/* Remove */}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(track.queueId)}
                    aria-label={`Remove ${track.song.title}`}
                    className="rounded-full p-1 text-white/25 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100 cursor-pointer focus:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
