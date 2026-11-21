"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RADIO_ENGINE_CONFIG } from "@/lib/radio/config";
import type { StationWire } from "@/lib/radio/types";

/** Poll the one global broadcast and expose listener actions. */
export function useSharedRadioSync() {
  const [wire, setWire] = useState<StationWire | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const wireRef = useRef<StationWire | null>(null);

  useEffect(() => {
    wireRef.current = wire;
  }, [wire]);

  const fetchWire = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/radio", { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as StationWire;
      setWire(data);
      return data;
    } catch {
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void fetchWire();
    const id = setInterval(() => {
      void fetchWire();
    }, RADIO_ENGINE_CONFIG.pollHintMs);
    return () => clearInterval(id);
  }, [fetchWire]);

  const post = useCallback(async (path: string, body: unknown): Promise<StationWire | null> => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as StationWire;
    setWire(data);
    return data;
  }, []);

  const skipStation = useCallback(
    () => post("/api/radio/skip", { version: wireRef.current?.version }),
    [post],
  );

  const reportComplete = useCallback(
    (refId: string) => post("/api/radio/complete", { refId, version: wireRef.current?.version }),
    [post],
  );

  const reportFailure = useCallback(
    (refId: string) => post("/api/radio/report", { refId, version: wireRef.current?.version }),
    [post],
  );

  const reportDuration = useCallback(
    (refId: string, durationMs: number) =>
      post("/api/radio/duration", {
        refId,
        durationMs,
        version: wireRef.current?.version,
      }),
    [post],
  );

  return {
    wire,
    isSyncing,
    refreshWire: fetchWire,
    skipStation,
    reportComplete,
    reportFailure,
    reportDuration,
  };
}
