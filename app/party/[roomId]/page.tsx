import { PartyView } from "@/components/party/PartyView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VYBE Party",
  description: "Live listening, together. Join a room and vibe in sync.",
};

export default async function PartyRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <PartyView initialRoomId={roomId} />;
}
