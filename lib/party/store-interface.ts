/**
 * Store adapter interface. The in-memory implementation is used by default;
 * set REDIS_URL to switch to the Redis-backed store for multi-instance
 * deployments or persistence across restarts.
 */
import type { PartyState, PartyPatch, PartyMember, VibeId } from "./types";

export type DispatchResult =
  | { ok: true; state: PartyState }
  | { ok: false; status: number; error: string };

export interface Envelope {
  event: "state" | "patch";
  data: PartyState | PartyPatch;
}

export type JoinResult =
  | { ok: true; member: PartyMember; state: PartyState }
  | { ok: false; status: number; error: string };

export type SubscribeFn = (
  roomId: string,
  memberId: string | null,
  enqueue: (msg: Envelope) => void,
) => () => void;

export interface PartyStore {
  createRoom(hostName: string, vibeId: VibeId): { roomId: string; member: PartyMember; state: PartyState };
  joinRoom(roomId: string, name: string): JoinResult | Promise<JoinResult>;
  getRoom(roomId: string): PartyState | null | Promise<PartyState | null>;
  subscribe: SubscribeFn;
  dispatch(roomId: string, memberId: string, command: string, payload: Record<string, unknown> | undefined): DispatchResult | Promise<DispatchResult>;
  startMaintenance(): void | Promise<void>;
}
