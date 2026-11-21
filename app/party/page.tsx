import { LazyPartyView } from "@/components/LazyPartyView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VYBE Jam",
  description: "VYBE Jam — live listening, together. Start a room and vibe in sync.",
};

export default function PartyPage() {
  return <LazyPartyView />;
}
