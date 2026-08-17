"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface SyncStatusProps {
  accent: string;
}

export function SyncStatus({ accent }: SyncStatusProps) {
  const [lastSyncText, setLastSyncText] = useState("just now");

  useEffect(() => {
    const interval = setInterval(() => {
      setLastSyncText("just now");
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <p className="text-[10px] tracking-widest text-white/40 uppercase">
          Sync Status
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 px-5 py-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/90">In sync</p>
          <p className="mt-1 text-[11px] text-white/30">
            Last synced {lastSyncText}
          </p>
        </div>
      </div>
    </div>
  );
}
