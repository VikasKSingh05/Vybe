"use client";

import { useCallback, useState } from "react";
import { useParty, type PartyStatus } from "@/hooks/useParty";
import type { VibeId } from "@/data/types";
import { PartyLanding } from "./PartyLanding";
import { PartyRoom } from "./PartyRoom";

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

  return <PartyRoom party={party} />;
}
