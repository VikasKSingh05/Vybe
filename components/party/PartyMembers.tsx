"use client";

import { Crown } from "lucide-react";
import type { PartyMember } from "@/lib/party/types";
import { cn } from "@/lib/cn";

interface PartyMembersProps {
  members: PartyMember[];
  hostId: string;
  meId: string;
  accent: string;
}

export function PartyMembers({ members, hostId, meId, accent }: PartyMembersProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
      <p className="mb-3 text-[10px] tracking-widest text-white/40 uppercase">
        In the room ({members.length})
      </p>

      {members.length === 0 ? (
        <p className="text-xs text-white/30">Nobody else yet — share the code.</p>
      ) : (
        <ul className="space-y-2.5">
          {members.map((member) => {
            const isHost = member.id === hostId;
            const isMe = member.id === meId;
            return (
              <li key={member.id} className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-black"
                  style={{
                    backgroundColor: isHost ? accent : "rgba(255,255,255,0.25)",
                  }}
                >
                  {member.name.slice(0, 1).toUpperCase()}
                </div>
                <span
                  className={cn(
                    "truncate text-sm",
                    isHost ? "font-medium text-white" : "text-white/60",
                  )}
                >
                  {member.name}
                </span>
                {isHost && (
                  <Crown
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: accent }}
                    aria-label="Host"
                  />
                )}
                {isMe && (
                  <span className="ml-auto shrink-0 text-[10px] tracking-wider text-white/30 uppercase">
                    you
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
