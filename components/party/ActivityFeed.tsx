"use client";

import { memo, useEffect, useState } from "react";
import type { Activity } from "@/hooks/usePartyActivity";

interface ActivityFeedProps {
  activities: Activity[];
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

const TYPE_CONFIG: Record<
  Activity["type"],
  { icon: string; verb: string; color?: string }
> = {
  reaction: { icon: "✨", verb: "reacted" },
  track_added: { icon: "🎵", verb: "added" },
  member_joined: { icon: "👋", verb: "joined" },
  member_left: { icon: "👋", verb: "left" },
};

export const ActivityFeed = memo(function ActivityFeed({ activities }: ActivityFeedProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <p className="text-[10px] tracking-widest text-white/40 uppercase">
          Recent Activity
        </p>
      </div>

      <div className="p-4 scrollbar-hide lg:min-h-0 lg:flex-1 lg:overflow-y-auto" aria-live="polite">
        {activities.length === 0 ? (
          <p className="text-xs text-white/25 py-2 text-center">
            Activity will appear here as people interact.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Recent activity">
            {activities.slice(0, 8).map((activity) => {
              const config = TYPE_CONFIG[activity.type];
              return (
                <li
                  key={activity.id}
                  className="flex items-start gap-2.5 rounded-lg px-2 py-1.5"
                >
                  <span className="mt-0.5 shrink-0 text-sm leading-none">
                    {activity.type === "reaction"
                      ? activity.emoji
                      : config.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/60 leading-relaxed">
                      <span className="font-medium text-white/80">
                        {activity.memberName}
                      </span>{" "}
                      {config.verb}{" "}
                      {activity.trackName && (
                        <span className="text-white/45">{activity.trackName}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
})
