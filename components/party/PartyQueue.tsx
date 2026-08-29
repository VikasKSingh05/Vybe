"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Music2, X, Play, ThumbsUp } from "lucide-react";
import type { PartyState } from "@/lib/party/types";
import { AlbumArt } from "@/components/AlbumArt";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatTime } from "@/lib/format-time";
import { sortQueueByVotes, voteCount, hasVoted } from "@/lib/party/votes";
import { cn } from "@/lib/cn";

interface PartyQueueProps {
  state: PartyState | null;
  isHost: boolean;
  memberId: string;
  accent: string;
  className?: string;
  onRemove: (queueId: string) => void;
  onPlayTrack?: (queueId: string) => void;
  onVote?: (queueId: string) => void;
}

export const PartyQueue = memo(function PartyQueue({
  state,
  isHost,
  memberId,
  accent,
  className,
  onRemove,
  onPlayTrack,
  onVote,
}: PartyQueueProps) {
  const queue = state?.queue ?? [];
  const displayedQueue = state ? sortQueueByVotes(queue) : [];
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const confirmingRef = useRef<string | null>(null);
  confirmingRef.current = confirmingId;

  const handleRemove = useCallback((queueId: string) => {
    if (confirmingRef.current === queueId) {
      setConfirmingId(null);
      onRemove(queueId);
    } else {
      setConfirmingId(queueId);
    }
  }, [onRemove]);

  return (
    <div className={cn("flex flex-col min-h-0 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl", className)}>
      <div className="shrink-0 flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <p className="text-[10px] tracking-widest text-white/40 uppercase">
          Up Next ({queue.length})
        </p>
      </div>

      {state === null ? (
        <div className="px-4 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="h-3 w-5 shrink-0 rounded" />
              <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="shrink-0 flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Music2 className="h-6 w-6 text-white/20" />
          <p className="text-sm text-white/40">Queue is empty</p>
          <p className="text-xs text-white/25">
            Add tracks below to get the party started.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 overflow-y-auto scrollbar-hide lg:min-h-0 lg:flex-1" aria-label="Queue">
          {displayedQueue.map((track, index) => {
            const isCurrent = state?.playback?.queueId === track.queueId;
            const canRemove = isHost || track.addedBy === memberId;
            const canPlay = isHost && !isCurrent;
            const votes = voteCount(track);
            const voted = hasVoted(track, memberId);
            return (
              <li
                key={track.queueId}
                role={canPlay ? "button" : undefined}
                tabIndex={canPlay ? 0 : undefined}
                onClick={canPlay ? () => onPlayTrack?.(track.queueId) : undefined}
                onKeyDown={canPlay ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPlayTrack?.(track.queueId); } } : undefined}
                className={cn(
                  "group flex items-center gap-3 px-4 py-2.5 sm:px-5 transition-colors",
                  isCurrent && "bg-orange-500/[0.06] border-l-2",
                  !isCurrent && "border-l-2 border-l-transparent",
                  canPlay && "cursor-pointer hover:bg-white/[0.04]",
                )}
                style={isCurrent ? { borderLeftColor: accent } : undefined}
              >
                <span
                  className="w-5 shrink-0 text-center text-[11px] tabular-nums text-white/25"
                  aria-hidden="true"
                >
                  {isCurrent ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                  ) : canPlay ? (
                    <span className="relative inline-flex h-4 w-4 items-center justify-center text-white/0 transition-colors group-hover:text-white/70">
                      <Play className="h-3 w-3 fill-current" />
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] tabular-nums text-white/25 group-hover:hidden">
                        {index + 1}
                      </span>
                    </span>
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
                <span className="shrink-0 text-[10px] text-white/40 hidden md:inline max-w-24 truncate">
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1" style={{ color: accent }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                      Playing now
                    </span>
                  ) : (
                    `by ${track.addedByName}`
                  )}
                </span>

                {/* Vote */}
                {onVote && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onVote(track.queueId); }}
                    aria-pressed={voted}
                    aria-label={voted ? `Remove your vote for ${track.song.title}` : `Vote for ${track.song.title}`}
                    className={cn(
                      "flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-full transition-colors cursor-pointer",
                      voted
                        ? "text-white"
                        : "text-white/35 hover:bg-white/10 hover:text-white",
                    )}
                    title={`${votes} ${votes === 1 ? "vote" : "votes"}`}
                  >
                    <ThumbsUp
                      className={cn("h-3.5 w-3.5", voted && "fill-current")}
                      style={voted ? { color: accent } : undefined}
                    />
                    <span className="text-[11px] font-semibold tabular-nums">{votes}</span>
                  </button>
                )}

                {/* Remove */}
                {canRemove && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemove(track.queueId); }}
                    onBlur={() => { if (confirmingRef.current === track.queueId) setConfirmingId(null); }}
                    aria-label={confirmingId === track.queueId ? `Confirm remove ${track.song.title}` : `Remove ${track.song.title}`}
                    className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 opacity-100 transition-all lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer focus:opacity-100 ${
                      confirmingId === track.queueId
                        ? "bg-red-400/20 text-red-300 hover:bg-red-400/30"
                        : "text-white/25 hover:bg-white/10 hover:text-white"
                    }`}
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
});
