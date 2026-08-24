import type { PartyMember } from "./types";

export interface HostChange {
  hostId: string;
  hostName: string;
}

/**
 * Detects a host handoff between two observed states. Returns null when
 * nothing changed, when either id is missing (no prior knowledge yet), or
 * when the new host id has no matching member.
 */
export function detectHostChange(
  prevHostId: string,
  nextHostId: string,
  members: PartyMember[],
): HostChange | null {
  if (!prevHostId || !nextHostId || prevHostId === nextHostId) return null;
  const host = members.find((m) => m.id === nextHostId);
  if (!host) return null;
  return { hostId: host.id, hostName: host.name };
}
