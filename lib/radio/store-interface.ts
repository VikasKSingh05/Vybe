import type { AdvanceReason, StationState, StationWire } from "./types";

/**
 * Contract for the single shared broadcast. Implementations must serialise
 * mutations so two listeners cannot advance the station twice for one event.
 */
export interface RadioStore {
  getStation(): Promise<StationState | null>;
  getWire(): Promise<StationWire>;
  reconcile(): Promise<StationWire>;
  advance(reason: AdvanceReason, expectedVersion?: number): Promise<StationWire>;
  reportFailure(refId: string, expectedVersion?: number): Promise<StationWire>;
  reportDuration(
    refId: string,
    durationMs: number,
    expectedVersion?: number,
  ): Promise<StationWire>;
  startMaintenance(): void | Promise<void>;
}
