"use client";

import dynamic from "next/dynamic";

const PartyView = dynamic(() => import("@/components/party/PartyView").then((m) => m.PartyView), {
  ssr: false,
});

export function LazyPartyView({ initialRoomId }: { initialRoomId?: string }) {
  return <PartyView initialRoomId={initialRoomId} />;
}
