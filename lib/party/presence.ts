import type { PartyMember } from "./types";

export type MemberPresence = "active" | "away";

/**
 * Classifies a member as active or away based on how stale their last
 * heartbeat is relative to the server's clock (avoids client skew).
 * The server's idle sweeper uses a much larger window, so "away" here is a
 * soft presence hint rather than an eviction signal.
 */
export function getPresence(
  member: PartyMember,
  serverNow: number,
  thresholdMs = 120_000,
): MemberPresence {
  return serverNow - member.lastSeen <= thresholdMs ? "active" : "away";
}
