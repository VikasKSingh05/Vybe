"use client";

import { useEffect, useState } from "react";
import { ChevronDown, SmilePlus } from "lucide-react";
import { PARTY_EMOJIS, type PartyReaction } from "@/lib/party/types";

const REACTION_TTL_MS = 4_000;
const PRUNE_TICK_MS = 1_000;

interface PartyReactionsProps {
  accent: string;
  disabled: boolean;
  reactions: PartyReaction[];
  onReact: (emoji: string) => void;
}

export function PartyReactions({
  accent,
  disabled,
  reactions,
  onReact,
}: PartyReactionsProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), PRUNE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const visible = reactions
    .filter((r) => now - r.at < REACTION_TTL_MS)
    .slice(-6)
    .reverse();

  return (
    <div className="fixed right-3 bottom-36 z-40 flex flex-col items-end gap-2 sm:right-5 sm:bottom-40">
      {visible.length > 0 && (
        <div className="flex flex-col-reverse items-end gap-1.5">
          {visible.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white/80 backdrop-blur-md party-reaction-pop"
            >
              <span className="text-base leading-none">{r.emoji}</span>
              <span className="max-w-28 truncate text-white/50">
                {r.memberName}
              </span>
            </div>
          ))}
        </div>
      )}

      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Open reactions"
          title="Reactions"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/45 text-white/70 backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:text-white cursor-pointer"
          style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22` }}
        >
          <SmilePlus className="h-5 w-5" style={{ color: accent }} />
        </button>
      ) : (
        <div
          className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-black/45 p-2 backdrop-blur-xl"
          style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22` }}
        >
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse reactions"
            className="mb-0.5 flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] tracking-widest text-white/40 uppercase transition-colors hover:bg-white/5 hover:text-white/80 cursor-pointer"
          >
            React
            <ChevronDown className="h-3 w-3" />
          </button>
          {PARTY_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={disabled}
              onClick={() => onReact(emoji)}
              aria-label={`React with ${emoji}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-transform duration-150 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
