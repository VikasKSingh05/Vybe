import type { PartyReaction } from "./types";

/**
 * Diff-based burst feed: returns reactions not present in `knownIds` and
 * prunes `knownIds` down to the current reaction list so it stays bounded
 * (reactions expire server-side after PARTY_REACTION_TTL_MS).
 */
export function diffNewReactions(
  reactions: PartyReaction[],
  knownIds: Set<string>,
): PartyReaction[] {
  const fresh = reactions.filter((r) => !knownIds.has(r.id));
  if (fresh.length === 0 && knownIds.size === reactions.length) return [];
  knownIds.clear();
  for (const reaction of reactions) knownIds.add(reaction.id);
  return fresh;
}
