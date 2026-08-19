/**
 * Party store — delegates to the in-memory or Redis-backed implementation
 * based on the REDIS_URL environment variable.
 */
export {
  createRoom,
  joinRoom,
  getRoom,
  subscribe,
  dispatch,
  getStore,
  startMaintenance,
} from "./store-factory";
export type { DispatchResult, Envelope, JoinResult, PartyStore } from "./store-interface";

// Kick off maintenance on import (preserves original singleton pattern).
// Use a global sentinel so HMR re-evaluation doesn't double-start the timer.
import { getStore } from "./store-factory";

const g = globalThis as unknown as { __vybe_maintenance?: ReturnType<typeof setInterval> };
if (!g.__vybe_maintenance) {
  g.__vybe_maintenance = setInterval(() => getStore().startMaintenance(), 25_000);
}
