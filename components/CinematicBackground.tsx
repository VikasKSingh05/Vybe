"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { VibeTheme } from "@/data/types";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface CinematicBackgroundProps {
  theme: VibeTheme;
  className?: string;
}

export function CinematicBackground({
  theme,
  className,
}: CinematicBackgroundProps) {
  const [currentTheme, setCurrentTheme] = useState<VibeTheme>(theme);
  const [prevTheme, setPrevTheme] = useState<VibeTheme | null>(null);
  const [currentReady, setCurrentReady] = useState(true);

  const currentLayerRef = useRef<HTMLDivElement>(null);
  const prevLayerRef = useRef<HTMLDivElement>(null);
  const loadTokenRef = useRef(0);
  const currentThemeIdRef = useRef(theme.id);
  const loadedRef = useRef(new Set<string>());

  // Swap the theme immediately so the vibe UI (tint, gradient, pills)
  // responds without waiting for the background image. The new image is
  // warmed in the browser cache and the crossfade is gated on readiness.
  useEffect(() => {
    if (theme.id === currentThemeIdRef.current) return;

    const token = ++loadTokenRef.current;
    currentThemeIdRef.current = theme.id;

    setPrevTheme(currentTheme);
    setCurrentTheme(theme);
    setCurrentReady(false);

    if (loadedRef.current.has(theme.background)) {
      setCurrentReady(true);
      return;
    }

    const probe = new window.Image();
    probe.onload = () => {
      if (loadTokenRef.current !== token) return;
      loadedRef.current.add(theme.background);
      setCurrentReady(true);
    };
    probe.onerror = () => {
      // Fall back to the gradient-only layer if the image cannot load.
      if (loadTokenRef.current !== token) return;
      loadedRef.current.add(theme.background);
      setCurrentReady(true);
    };
    probe.src = theme.background;

    return () => {
      loadTokenRef.current += 1;
    };
  }, [theme]);

  // Crossfade + scale between background layers (WAAPI), only once the new
  // background image is cached. Before that, hold the previous image fully
  // visible so the old vibe never dips into black.
  useEffect(() => {
    const current = currentLayerRef.current;
    const prev = prevLayerRef.current;
    if (!current) return;

    if (!currentReady) {
      current.style.opacity = "0";
      current.style.transform = "none";
      if (prev) {
        prev.style.opacity = "1";
        prev.style.transform = "none";
      }
      return;
    }

    // Resting state after the transition completes.
    current.style.opacity = "1";
    current.style.transform = "none";

    // First mount — nothing to fade from.
    if (!prev || prefersReducedMotion()) {
      setPrevTheme(null);
      return;
    }

    const inAnim = current.animate(
      [
        { opacity: 0, transform: "scale(1.07)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      {
        duration: 850,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
    );

    const outAnim = prev.animate(
      [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(1.04)" },
      ],
      {
        duration: 850,
        easing: "cubic-bezier(0.455, 0.03, 0.515, 0.955)",
        fill: "forwards",
      },
    );
    outAnim.finished
      .then(() => setPrevTheme(null))
      .catch(() => {});

    return () => {
      inAnim.cancel();
      outAnim.cancel();
    };
  }, [currentTheme, currentReady]);

  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden bg-black select-none pointer-events-none",
        className,
      )}
    >
      {/* Instant gradient fallback — visible while the image loads */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: currentTheme.overlay }}
        aria-hidden="true"
      />

      {/* Previous background layer fading out */}
      {prevTheme && (
        <div
          ref={prevLayerRef}
          className="absolute inset-0 z-0"
          aria-hidden="true"
        >
          <Image
            src={prevTheme.background}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div
            className="absolute inset-0"
            style={{ background: prevTheme.overlay }}
          />
        </div>
      )}

      {/* Current background layer fading in */}
      <div
        ref={currentLayerRef}
        key={currentTheme.id}
        className="absolute inset-0 z-10"
        aria-hidden="true"
      >
        <Image
          src={currentTheme.background}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <div
          className="absolute inset-0"
          style={{ background: currentTheme.overlay }}
        />
      </div>

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
          background: `linear-gradient(135deg, ${currentTheme.accent}22 0%, transparent 50%, rgba(0,0,0,0.3) 100%)`,
        }}
      />

      {/* Film grain texture */}
      <div className="grain-overlay pointer-events-none absolute inset-0 z-30 opacity-[0.04]" />
    </div>
  );
}
