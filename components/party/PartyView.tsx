"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useParty, type PartyStatus } from "@/hooks/useParty";
import type { VibeId } from "@/data/types";
import { PartyLanding } from "./PartyLanding";

const PartyRoom = dynamic(() => import("./PartyRoom").then((m) => m.PartyRoom), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 text-white/60">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
      <p className="text-sm">Loading room…</p>
    </div>
  ),
});

interface PartyViewProps {
  initialRoomId?: string;
}

export function PartyView({ initialRoomId }: PartyViewProps) {
  const party = useParty();
  const [landingError, setLandingError] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (name: string, vibeId: VibeId) => {
      setLandingError(null);
      try {
        await party.createParty(name, vibeId);
      } catch (err) {
        setLandingError(err instanceof Error ? err.message : "Failed to create party");
      }
    },
    [party],
  );

  const handleJoin = useCallback(
    async (roomId: string, name: string) => {
      setLandingError(null);
      try {
        await party.joinParty(roomId, name);
      } catch (err) {
        setLandingError(err instanceof Error ? err.message : "Failed to join party");
      }
    },
    [party],
  );

  const active: PartyStatus = party.status;

  if (active === "idle" || active === "closed") {
    return (
      <PartyLanding
        initialRoomId={initialRoomId}
        error={landingError ?? party.error ?? undefined}
        onCreate={handleCreate}
        onJoin={handleJoin}
      />
    );
  }

  if (active === "connecting") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
        <p className="text-sm">Connecting to party…</p>
      </div>
    );
  }

  return <PartyRoom party={party} />;
}
