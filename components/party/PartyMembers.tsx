"use client";

import { memo } from "react";
import { Crown, UserPlus } from "lucide-react";
import type { PartyMember } from "@/lib/party/types";
import { cn } from "@/lib/cn";

interface PartyMembersProps {
  members: PartyMember[];
  hostId: string;
  meId: string;
  accent: string;
  onInvite?: () => void;
}

const AVATAR_COLORS = [
  "#e07a3a", "#c41e3a", "#e8a0bf", "#d4943a", "#d4b24c",
  "#5b8fa8", "#7c6fcf", "#4caf87", "#cf6f8a", "#6fa3cf",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const PartyMembers = memo(function PartyMembers({ members, hostId, meId, accent, onInvite }: PartyMembersProps) {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <p className="text-[10px] tracking-widest text-white/40 uppercase">
          In the Room ({members.length})
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-hide">
        {members.length === 0 ? (
          <p className="text-xs text-white/30 py-2">Nobody else yet — share the code.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((member) => {
              const isHost = member.id === hostId;
              const isMe = member.id === meId;
              return (
                <li
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]"
                >
                  {/* Avatar */}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-black"
                    style={{
                      backgroundColor: isHost ? accent : getAvatarColor(member.name),
                    }}
                  >
                    {member.name.slice(0, 1).toUpperCase()}
                  </div>

                  {/* Name + badge */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "truncate text-sm",
                          isHost ? "font-semibold text-white" : "text-white/70",
                        )}
                      >
                        {member.name}
                      </span>
                      {isMe && (
                        <span className="shrink-0 text-[9px] tracking-wider text-white/25 uppercase">
                          you
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Host badge */}
                  {isHost && (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase" style={{ color: accent }}>
                      <Crown className="h-2.5 w-2.5" />
                      Host
                    </span>
                  )}

                  {/* Online dot */}
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400/80" />
                </li>
              );
            })}
          </ul>
        )}

        {/* Invite button */}
        {onInvite && (
          <button
            type="button"
            onClick={onInvite}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white/80 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite friends
          </button>
        )}
      </div>
    </div>
  );
})
