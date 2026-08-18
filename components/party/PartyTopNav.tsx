"use client";

import { Copy, Check, LogOut, Users, Music } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface PartyTopNavProps {
  roomId: string;
  memberCount: number;
  queueCount: number;
  accent: string;
  onLeave: () => void;
}

export function PartyTopNav({
  roomId,
  memberCount,
  queueCount,
  accent,
  onLeave,
}: PartyTopNavProps) {
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = () => copy(roomId.toUpperCase());

  return (
    <header className="fixed top-0 right-0 left-0 z-30 flex items-center gap-4 border-b border-white/[0.06] bg-black/50 px-4 py-3 backdrop-blur-xl sm:px-6 select-none">
      {/* Left section */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-display text-sm font-semibold tracking-tight text-white/90 shrink-0">
          VYBE
        </span>
        <div className="h-4 w-px bg-white/15 shrink-0" />
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-white/50 uppercase">
          Jam Room
        </span>
        <span className="font-mono text-sm font-semibold tracking-[0.2em] text-white shrink-0 hidden sm:inline">
          {roomId.toUpperCase()}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80 cursor-pointer"
          title="Copy room code"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" style={{ color: accent }} />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <p className="hidden lg:block truncate text-[11px] text-white/35">
          Invite friends and vibe together
        </p>
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-white/50">
          <Users className="h-3 w-3" style={{ color: accent }} />
          {memberCount}
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-white/50">
          <Music className="h-3 w-3" style={{ color: accent }} />
          {queueCount}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-white/60 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
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
          className="flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1.5 text-[10px] font-medium text-red-300 transition-colors hover:bg-red-400/20 cursor-pointer"
        >
          <LogOut className="h-3 w-3" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
}
