"use client";

import { useEffect } from "react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RoomError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[VYBE] Room error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10">
          <span className="text-2xl">!</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-white">
          Could not join room
        </h1>
        <p className="mt-3 text-sm text-white/50">
          This room may have been closed or the code is invalid.
        </p>
        <a
          href="/"
          className="mt-4 inline-block text-xs text-white/30 transition-colors hover:text-white/50"
        >
          Go home
        </a>
        <a
          href="/party"
          className="mt-6 inline-block rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          Join another party
        </a>
      </div>
    </div>
  );
}
