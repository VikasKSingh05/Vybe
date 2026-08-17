"use client";

import { Music2, X } from "lucide-react";
import type { PartyState } from "@/lib/party/types";
import { AlbumArt } from "@/components/AlbumArt";
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
      <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
        <p className="text-[10px] tracking-widest text-white/40 uppercase">
          Now playing / queue
        </p>
        <span className="text-[11px] tabular-nums text-white/30">
          {queue.length} track{queue.length === 1 ? "" : "s"}
        </span>
      </div>

      {queue.length === 0 ? (
        <div className="shrink-0 flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Music2 className="h-6 w-6 text-white/20" />
          <p className="text-sm text-white/40">Queue is empty</p>
          <p className="text-xs text-white/25">
            Host can search and add tracks, or guests can add their own below.
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
                  "group flex items-center gap-3 px-4 py-3 sm:px-5",
                  isCurrent && "bg-white/[0.04]",
                )}
              >
                <span
                  className="w-4 shrink-0 text-center text-[11px] tabular-nums text-white/30"
                  aria-hidden="true"
                >
                  {index + 1}
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
                      isCurrent ? "text-white" : "text-white/80",
                    )}
                  >
                    {track.song.title}
                    {isCurrent && (
                      <span
                        className="ml-2 text-[10px] tracking-widest uppercase"
                        style={{ color: accent }}
                      >
                        ● playing
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-white/40">
                    {track.song.artist}
                    <span className="mx-1.5 text-white/20">·</span>
                    <span className="text-white/30">
                      added by {track.addedByName}
                    </span>
                  </p>
                </div>

                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(track.queueId)}
                    aria-label={`Remove ${track.song.title}`}
                    className="rounded-full p-1.5 text-white/30 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100 cursor-pointer focus:opacity-100"
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
