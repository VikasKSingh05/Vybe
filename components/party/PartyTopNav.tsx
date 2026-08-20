"use client";

import { memo } from "react";
import { Copy, Check, LogOut, Users, Music } from "lucide-react";
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
    <header className="fixed top-0 right-0 left-0 z-30 flex items-center gap-2 sm:gap-4 border-b border-white/[0.06] bg-black/50 px-3 sm:px-4 py-3 backdrop-blur-xl sm:px-6">
      {/* Left section */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="font-display text-sm font-semibold tracking-tight text-white/90 shrink-0">
          VYBE
        </span>
        <div className="h-4 w-px bg-white/15 shrink-0 hidden sm:block" />
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-white/50 uppercase hidden sm:inline">
          Jam Room
        </span>
        <span className="font-mono text-sm font-semibold tracking-[0.2em] text-white shrink-0 hidden sm:inline">
          {roomId.toUpperCase()}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 transition-colors hover:bg-white/10 hover:text-white/80 cursor-pointer"
          title="Copy room code"
          aria-label="Copy room code"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" style={{ color: accent }} />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <p className="hidden lg:block truncate text-[11px] text-white/40">
          Invite friends and vibe together
        </p>
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-white/50 min-h-[44px]">
          <Users className="h-3 w-3" style={{ color: accent }} />
          {memberCount}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-white/50 min-h-[44px]">
          <Music className="h-3 w-3" style={{ color: accent }} />
          {queueCount}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white/60 transition-colors hover:bg-white/10 hover:text-white cursor-pointer min-h-[44px]"
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
          className="flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-400/10 px-3 py-2 text-[10px] font-medium text-red-300 transition-colors hover:bg-red-400/20 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
        >
          <LogOut className="h-3 w-3" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
});
