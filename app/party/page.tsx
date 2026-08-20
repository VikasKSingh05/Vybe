import { LazyPartyView } from "@/components/LazyPartyView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VYBE Party",
  description: "Live listening, together. Start a room and vibe in sync.",
};

export default function PartyPage() {
  return <LazyPartyView />;
}
