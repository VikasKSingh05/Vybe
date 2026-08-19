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
import { getStore } from "./store-factory";

let maintenanceStarted = false;
if (!maintenanceStarted) {
  maintenanceStarted = true;
  setInterval(() => getStore().startMaintenance(), 25_000);
}
