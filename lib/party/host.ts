import type { PartyMember, PartyState } from "./types";

/**
 * Host authority has exactly one source of truth: `PartyState.hostId`.
 * Per-member host flags were removed because they could disagree with hostId
 * after a transfer, a departure, or an out-of-order state broadcast — leaving
 * a party with two hosts, no host, or a host who had already left.
 */
export function chooseSuccessor(
  members: PartyMember[],
  excludedId?: string,
): PartyMember | null {
  const candidates = members
    .filter((m) => m.id !== excludedId)
    .slice()
    .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
  return candidates[0] ?? null;
}

/**
 * Repairs a dangling/empty host reference in place. Returns true when the
 * host actually changed. Rooms are expected to be deleted when empty, but
 * callers still get a deterministic `hostId: ""` rather than a stale id.
 */
export function ensureValidHost(state: PartyState): boolean {
  if (state.members.length === 0) {
    if (state.hostId !== "") {
      state.hostId = "";
      return true;
    }
    return false;
  }
  if (state.members.some((m) => m.id === state.hostId)) return false;
  const successor = chooseSuccessor(state.members);
  state.hostId = successor?.id ?? "";
  return successor !== null;
}
