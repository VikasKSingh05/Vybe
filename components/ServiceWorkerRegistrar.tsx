"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/lib/toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const UPDATE_TOAST_MS = 12000;
const OFFLINE_TOAST_MS = 6000;

/**
 * Registers the service worker and surfaces its lifecycle honestly:
 * a passive toast when a new version is waiting (never auto-reloads),
 * and a single notice when the connection drops.
 */
export function ServiceWorkerRegistrar() {
  const isOnline = useOnlineStatus();
  // Toast once per offline period, only on the falling edge — not on mount
  // if the page was loaded offline (the user already knows).
  const announcedOffline = useRef(false);

  useEffect(() => {
    if (isOnline) {
      announcedOffline.current = false;
      return;
    }
    if (announcedOffline.current) return;
    announcedOffline.current = true;
    toast("You're offline — playback needs a connection", "error", OFFLINE_TOAST_MS);
  }, [isOnline]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    const announceWaiting = (worker: ServiceWorker | null) => {
      if (!worker) return;
      // No controller means this install is the page's first worker, not an
      // update sitting in the waiting phase.
      if (!navigator.serviceWorker.controller) return;
      if (!cancelled) {
        toast("New version ready — refresh to update", "info", UPDATE_TOAST_MS);
      }
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          new URL("../lib/service-worker.js", import.meta.url),
          { scope: "/", updateViaCache: "none" },
        );
        if (cancelled) return;

        // An update may have finished installing before this load registered.
        announceWaiting(registration.waiting ?? null);

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              announceWaiting(installing);
            }
          });
        });
      } catch {
        // Registration failures (insecure origin, hard blockers) are silent:
        // the app works identically without the SW.
      }
    };

    register();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
