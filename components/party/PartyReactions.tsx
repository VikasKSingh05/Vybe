"use client";

import { useEffect, useState } from "react";
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

      <div
        className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-black/45 p-2 backdrop-blur-xl"
        style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22` }}
      >
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
    </div>
  );
}
