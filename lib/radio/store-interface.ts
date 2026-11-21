import type { AdvanceReason, RadioStationId, StationState, StationSummary, StationWire } from "./types";

export interface RadioStore {
  getStation(stationId: RadioStationId): Promise<StationState | null>;
  getWire(stationId: RadioStationId): Promise<StationWire>;
  listSummaries(): Promise<StationSummary[]>;
  reconcile(stationId: RadioStationId): Promise<StationWire>;
  advance(stationId: RadioStationId, reason: AdvanceReason, expectedVersion?: number): Promise<StationWire>;
  reportFailure(stationId: RadioStationId, refId: string, expectedVersion?: number): Promise<StationWire>;
  startMaintenance(): void | Promise<void>;
}
