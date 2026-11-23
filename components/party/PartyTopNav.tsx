"use client";

import { memo } from "react";
import { Check, Copy, LogOut, Music, Users } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface PartyTopNavProps {
  roomId: string;
  memberCount: number;
  queueCount: number;
  accent: string;
  onLeave: () => void;
}

export const PartyTopNav = memo(function PartyTopNav({
  roomId,
  memberCount,
  queueCount,
  accent,
  onLeave,
}: PartyTopNavProps) {
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = () => copy(roomId.toUpperCase());

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-paper/10 bg-ink/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-[60px] w-full max-w-6xl items-center gap-3 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-display text-base font-extrabold tracking-[0.28em] text-paper">
            VYBE
          </span>
          <span className="mono-label hidden rounded-full border border-signal/40 bg-signal/10 px-2 py-1 text-signal sm:inline">
            Jam
          </span>
          <span className="hidden h-4 w-px bg-paper/15 sm:block" />
          <span className="hidden font-mono text-xs font-semibold tracking-[0.2em] text-paper/80 sm:inline">
            {roomId.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-paper/40 transition-colors hover:bg-paper/10 hover:text-paper cursor-pointer"
            title="Copy room code"
            aria-label="Copy room code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" style={{ color: accent }} />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden min-h-[44px] items-center gap-2 sm:flex">
            <Users className="h-3.5 w-3.5" style={{ color: accent }} />
            <span className="mono-label text-paper/45">{memberCount} in room</span>
          </div>
          <div className="hidden min-h-[44px] items-center gap-2 sm:flex">
            <Music className="h-3.5 w-3.5" style={{ color: accent }} />
            <span className="mono-label text-paper/45">{queueCount} queued</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="mono-label hidden min-h-[44px] items-center gap-1.5 rounded-full border border-paper/12 px-3 text-paper/60 transition-colors hover:border-signal/40 hover:text-paper sm:flex"
            aria-label="Copy room code"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" style={{ color: accent }} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy code
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onLeave}
            aria-label="Leave party"
            className="mono-label flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-red-400/25 bg-red-400/10 px-3 text-red-300 transition-colors hover:bg-red-400/20"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>
    </header>
  );
});
