import type { PartyTrack } from "./types";

export interface PartyVote {
  memberId: string;
  memberName: string;
  votedAt: number;
}

export function voteCount(track: Pick<PartyTrack, "votes">): number {
  return track.votes.length;
}

export function hasVoted(
  track: Pick<PartyTrack, "votes">,
  memberId: string,
): boolean {
  return track.votes.some((v) => v.memberId === memberId);
}

/**
 * Sort the queue for display and "next" selection: highest vote count first,
 * ties broken by earliest vote time (FIFO), then by queue order.
 */
export function sortQueueByVotes(queue: PartyTrack[]): PartyTrack[] {
  return queue
    .map((t, idx) => ({ t, idx }))
    .sort((a, b) => {
      const va = a.t.votes.length;
      const vb = b.t.votes.length;
      if (va !== vb) return vb - va;
      const fa = earliestVoteAt(a.t);
      const fb = earliestVoteAt(b.t);
      if (fa !== fb) return fa - fb;
      return a.idx - b.idx;
    })
    .map((x) => x.t);
}

function earliestVoteAt(track: Pick<PartyTrack, "votes">): number {
  if (track.votes.length === 0) return Infinity;
  let earliest = Infinity;
  for (const v of track.votes) {
    if (v.votedAt < earliest) earliest = v.votedAt;
  }
  return earliest;
}
