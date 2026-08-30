"use client";

import dynamic from "next/dynamic";

// Render the player server-side so the page ships real content instead of a
// blank/loading screen that then pops in — that pop is the "flash on load".
// Session restore still works because usePlayer re-applies persisted state
// after hydration (localStorage is client-only).
const VybeApp = dynamic(() => import("@/components/VybeApp"), { ssr: true });

export function LazyVybeApp() {
  return <VybeApp />;
}
