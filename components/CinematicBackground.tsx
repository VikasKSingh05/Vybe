"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { VibeTheme } from "@/data/types";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface Layer {
  theme: VibeTheme;
  ready: boolean;
  failed: boolean;
}

interface CinematicBackgroundProps {
  theme: VibeTheme;
  className?: string;
}

function initialLayers(theme: VibeTheme): [Layer, Layer] {
  return [
    { theme, ready: true, failed: false },
    { theme, ready: false, failed: false },
  ];
}

/**
 * Two persistent background layers. Exactly one is fully visible at all times
 * (inline opacity derived from state), so a vibe switch never drops the frame to
 * an empty/black/partial surface. The next vibe is written into the hidden slot
 * and only promoted once ITS OWN <Image> has actually loaded.
 */
export function CinematicBackground({
  theme,
  className,
}: CinematicBackgroundProps) {
  const [layers, setLayers] = useState<Layer[]>(() => initialLayers(theme));
  const [activeIndex, setActiveIndex] = useState(0);

  const layersRef = useRef(layers);
  layersRef.current = layers;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const elRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  // Generation/request id: only the latest requested vibe may animate/advance.
  const transitionIdRef = useRef(1);
  // Per-slot id of the transition it currently belongs to.
  const slotTransitionIdRef = useRef([0, 0]);
  const animRef = useRef<{ cancel: () => void } | null>(null);
  const handledThemeIdRef = useRef(theme.id);

  const cancelFade = useCallback(() => {
    if (animRef.current) {
      animRef.current.cancel();
      animRef.current = null;
    }
  }, []);

  const startFade = useCallback(
    (to: number) => {
      const from = 1 - to;
      const fromEl = elRefs[from].current;
      const toEl = elRefs[to].current;
      if (!fromEl || !toEl) return;

      const reduce = prefersReducedMotion();
      const sameVisual =
        layersRef.current[from].theme.id === layersRef.current[to].theme.id;

      if (reduce || sameVisual) {
        toEl.style.opacity = "1";
        fromEl.style.opacity = "0";
        setActiveIndex(to);
        return;
      }

      const inAnim = toEl.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 850, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
      );
      const outAnim = fromEl.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 850, easing: "cubic-bezier(0.455, 0.03, 0.515, 0.955)" },
      );

      const controller = {
        cancel() {
          inAnim.cancel();
          outAnim.cancel();
        },
      };
      animRef.current = controller;

      Promise.allSettled([inAnim.finished, outAnim.finished]).then(() => {
        // A newer vibe request arrived and cancelled this fade — don't commit.
        if (animRef.current !== controller) return;
        animRef.current = null;
        toEl.style.opacity = "1";
        fromEl.style.opacity = "0";
        setActiveIndex(to);
      });
    },
    [],
  );

  const handleLoad = useCallback(
    (i: number) => {
      if (slotTransitionIdRef.current[i] !== transitionIdRef.current) return;
      if (i === activeIndexRef.current) return;
      setLayers((prev) => {
        if (!prev[i] || prev[i].ready || prev[i].failed) return prev;
        const next = [...prev];
        next[i] = { ...next[i], ready: true };
        return next;
      });
    },
    [],
  );

  const handleError = useCallback((i: number) => {
    if (slotTransitionIdRef.current[i] !== transitionIdRef.current) return;
    setLayers((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ready: false, failed: true };
      return next;
    });
  }, []);

  // Drive the crossfade when the incoming (hidden) layer becomes ready.
  useEffect(() => {
    const incoming = 1 - activeIndexRef.current;
    const layer = layers[incoming];
    if (!layer || !layer.ready || layer.failed) return;
    if (slotTransitionIdRef.current[incoming] !== transitionIdRef.current) return;
    if (layer.theme.id === layers[activeIndexRef.current].theme.id) return;
    startFade(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  // New vibe requested.
  useEffect(() => {
    if (theme.id === handledThemeIdRef.current) return;
    handledThemeIdRef.current = theme.id;

    const id = ++transitionIdRef.current;
    const activeIdx = activeIndexRef.current;
    const activeLayer = layersRef.current[activeIdx];

    // Same vibe is already the fully visible background: stop any in-flight
    // crossfade and drop the stale pending load so it can never surface.
    if (theme.id === activeLayer.theme.id) {
      cancelFade();
      slotTransitionIdRef.current[1 - activeIdx] = 0;
      return;
    }

    // Cancel any crossfade in flight first. Cancelling the WAAPI animation
    // returns the active layer to full visibility; the hidden one stays hidden,
    // so an observer never sees a momentarily-empty or intermediate surface.
    cancelFade();

    const incoming = 1 - activeIdx;
    slotTransitionIdRef.current[incoming] = id;
    setLayers((prev) => {
      const next = [...prev];
      next[incoming] = { theme, ready: false, failed: false };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden bg-black select-none pointer-events-none",
        className,
      )}
    >
      {/* Instant gradient fallback — always present below the visible layer */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: theme.overlay }}
        aria-hidden="true"
      />

      {/* Two stable background slots. Exactly one is at opacity 1 at all times;
          the other is hidden (opacity 0) and loads without being seen. */}
      {[0, 1].map((i) => {
        const layer = layers[i];
        return (
          <div
            key={`layer-${i}`}
            ref={elRefs[i]}
            className="absolute inset-0 z-10"
            style={{ opacity: i === activeIndex ? 1 : 0 }}
            aria-hidden="true"
          >
            <Image
              src={layer.theme.background}
              alt=""
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
              onLoad={() => handleLoad(i)}
              onError={() => handleError(i)}
            />
            <div
              className="absolute inset-0"
              style={{ background: layer.theme.overlay }}
            />
          </div>
        );
      })}

      {/* Subtle atmospheric dark gradient overlay & vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.6) 100%)",
        }}
      />

      {/* Atmospheric color tint matching active vibe */}
      <div
        className="pointer-events-none absolute inset-0 z-20 mix-blend-soft-light opacity-30 transition-colors duration-1000"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}22 0%, transparent 50%, rgba(0,0,0,0.3) 100%)`,
        }}
      />

      {/* Film grain texture */}
      <div className="grain-overlay pointer-events-none absolute inset-0 z-30 opacity-[0.04]" />
    </div>
  );
}
