"use client";

import { useEffect, useRef, useState } from "react";
import type { PartyState } from "@/lib/party/types";

export interface Activity {
  id: string;
  type: "reaction" | "track_added" | "member_joined" | "member_left";
  memberName: string;
  trackName?: string;
  emoji?: string;
  timestamp: number;
}

const MAX_ACTIVITIES = 20;

export function usePartyActivity(state: PartyState | null) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const prevStateRef = useRef<PartyState | null>(null);

  useEffect(() => {
    if (!state) return;
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (!prev) return;

    // Cheap pre-check: skip diffing if the relevant arrays haven't changed length
    const queueChanged = state.queue.length !== prev.queue.length;
    const reactionsChanged = state.reactions.length !== prev.reactions.length;
    const membersChanged = state.members.length !== prev.members.length;
    if (!queueChanged && !reactionsChanged && !membersChanged) return;

    const newActivities: Activity[] = [];

    // Detect new queue entries
    const prevQueueIds = new Set(prev.queue.map((t) => t.queueId));
    state.queue.forEach((track) => {
      if (!prevQueueIds.has(track.queueId)) {
        newActivities.push({
          id: `add-${track.queueId}`,
          type: "track_added",
          memberName: track.addedByName,
          trackName: track.song.title,
          timestamp: Date.now(),
        });
      }
    });

    // Detect new reactions
    const prevReactionIds = new Set(prev.reactions.map((r) => r.id));
    state.reactions.forEach((reaction) => {
      if (!prevReactionIds.has(reaction.id)) {
        newActivities.push({
          id: `react-${reaction.id}`,
          type: "reaction",
          memberName: reaction.memberName,
          emoji: reaction.emoji,
          timestamp: Date.now(),
        });
      }
    });

    // Detect member joins
    const prevMemberIds = new Set(prev.members.map((m) => m.id));
    state.members.forEach((member) => {
      if (!prevMemberIds.has(member.id)) {
        newActivities.push({
          id: `join-${member.id}`,
          type: "member_joined",
          memberName: member.name,
          timestamp: Date.now(),
        });
      }
    });

    // Detect member leaves
    const currentMemberIds = new Set(state.members.map((m) => m.id));
    prev.members.forEach((member) => {
      if (!currentMemberIds.has(member.id)) {
        newActivities.push({
          id: `leave-${member.id}-${Date.now()}`,
          type: "member_left",
          memberName: member.name,
          timestamp: Date.now(),
        });
      }
    });

    if (newActivities.length > 0) {
      setActivities((prev) => [...newActivities, ...prev].slice(0, MAX_ACTIVITIES));
    }
  }, [state]);

  return activities;
}
