"use client";

import dynamic from "next/dynamic";

const VybeApp = dynamic(() => import("@/components/VybeApp"), { ssr: false });

export function LazyVybeApp() {
  return <VybeApp />;
}
