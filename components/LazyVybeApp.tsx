"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const VybeApp = dynamic(() => import("@/components/VybeApp"), {
  loading: () => <VybeAppSkeleton />,
});

function VybeAppSkeleton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="relative min-h-dvh overflow-hidden text-white font-sans antialiased select-none">
        <div className="fixed inset-0 -z-10 bg-black" />
        <header className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
          <div className="w-16 h-6 animate-pulse bg-white/10 rounded" />
          <div className="w-32 h-6 animate-pulse bg-white/10 rounded" />
        </header>
        <main id="main-content" className="relative z-10 flex h-dvh flex-col items-center overflow-y-auto pb-44 sm:pb-48 md:pb-52">
          <div className="my-auto flex w-full flex-col items-center">
            <section className="flex flex-col items-center px-6 text-center animate-pulse">
              <div className="w-64 h-16 mx-auto bg-gradient-to-r from-white/20 to-white/5 rounded-xl" />
            </section>
            <div className="mt-8 shrink-0 sm:mt-10 w-full max-w-xl">
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="shrink-0 w-28 h-10 bg-white/10 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <div className="fixed right-0 bottom-0 left-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-[max(2rem,env(safe-area-inset-bottom))] animate-pulse">
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl rounded-2xl border border-white/10 bg-black/45 p-3.5 sm:p-4 md:p-5 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-3.5">
              <div className="h-16 w-16 rounded-lg bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-white/10 rounded" />
                <div className="h-3 w-1/2 bg-white/10 rounded" />
              </div>
            </div>
            <div className="mb-1 h-2 bg-white/10 rounded-full" />
            <div className="mb-3 flex justify-between text-[10px] tabular-nums font-mono text-white/40">
              <div className="w-12 h-4 bg-white/10 rounded" />
              <div className="w-12 h-4 bg-white/10 rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-8 w-24 bg-white/10 rounded-full" />
              <div className="h-12 w-12 bg-white/10 rounded-full" />
              <div className="h-8 w-20 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <VybeApp />;
}

export function LazyVybeApp() {
  return <VybeApp />;
}