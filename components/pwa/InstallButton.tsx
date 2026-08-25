"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * One-click install affordance for browsers that fire beforeinstallprompt
 * (desktop Chrome/Edge, Android). Renders nothing until the browser says
 * installation is actually available, so unsupported platforms (iOS) and
 * already-installed contexts stay clean.
 */
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onAvailable = (event: Event) => {
      // The browser only fires this when install criteria are met; deferring
      // it lets us trigger the native dialog from a user gesture of our own.
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPromptEvent(null);

    window.addEventListener("beforeinstallprompt", onAvailable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  return (
    <button
      type="button"
      onClick={() => {
        void promptEvent.prompt();
        // Regardless of outcome, the prompt is single-use.
        setPromptEvent(null);
      }}
      className="flex min-h-[44px] items-center gap-1 px-1 text-[11px] tracking-wide text-white/50 transition-colors duration-300 hover:text-white/90 cursor-pointer"
    >
      Install
    </button>
  );
}
