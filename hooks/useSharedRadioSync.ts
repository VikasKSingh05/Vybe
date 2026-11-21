"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VibeId } from "@/data/types";
import { RADIO_ENGINE_CONFIG } from "@/lib/radio/config";
import type { RadioStationId, StationSummary, StationWire } from "@/lib/radio/types";

function isSharedStation(vibeId: VibeId): vibeId is RadioStationId {
  return vibeId !== "random";
}

export function useSharedRadioSync(activeVibeId: VibeId) {
  const [summaries, setSummaries] = useState<StationSummary[]>([]);
  const [wire, setWire] = useState<StationWire | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const wireRef = useRef<StationWire | null>(null);
  const activeVibeRef = useRef(activeVibeId);

  useEffect(() => {
    activeVibeRef.current = activeVibeId;
  }, [activeVibeId]);

  useEffect(() => {
    wireRef.current = wire;
  }, [wire]);

  const fetchSummaries = useCallback(async () => {
    try {
      const res = await fetch("/api/radio", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { stations?: StationSummary[] };
      setSummaries(data.stations ?? []);
    } catch {
      // non-fatal
    }
  }, []);

  const fetchWire = useCallback(async (stationId: RadioStationId) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/radio/${stationId}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as StationWire;
      if (activeVibeRef.current === stationId) {
        setWire(data);
      }
      return data;
    } catch {
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummaries();
  }, [fetchSummaries]);

  useEffect(() => {
    if (!isSharedStation(activeVibeId)) {
      setWire(null);
      return;
    }
    void fetchWire(activeVibeId);
    const id = setInterval(() => {
      void fetchWire(activeVibeId);
    }, RADIO_ENGINE_CONFIG.pollHintMs);
    return () => clearInterval(id);
  }, [activeVibeId, fetchWire]);

  const skipStation = useCallback(async () => {
    if (!isSharedStation(activeVibeRef.current)) return null;
    const stationId = activeVibeRef.current;
    const version = wireRef.current?.version;
    const res = await fetch(`/api/radio/${stationId}/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as StationWire;
    setWire(data);
    return data;
  }, []);

  const reportComplete = useCallback(async (refId: string) => {
    if (!isSharedStation(activeVibeRef.current)) return null;
    const stationId = activeVibeRef.current;
    const version = wireRef.current?.version;
    const res = await fetch(`/api/radio/${stationId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refId, version }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as StationWire;
    setWire(data);
    return data;
  }, []);

  const reportFailure = useCallback(async (refId: string) => {
    if (!isSharedStation(activeVibeRef.current)) return null;
    const stationId = activeVibeRef.current;
    const version = wireRef.current?.version;
    const res = await fetch(`/api/radio/${stationId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refId, version }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as StationWire;
    setWire(data);
    return data;
  }, []);

  return {
    isSharedStation: isSharedStation(activeVibeId),
    summaries,
    wire,
    isSyncing,
    refreshSummaries: fetchSummaries,
    refreshWire: fetchWire,
    skipStation,
    reportComplete,
    reportFailure,
  };
}
