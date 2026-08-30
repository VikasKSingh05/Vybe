"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const isMountedRef = useRef(false);

  // Preload a background image
  const preloadBackground = useCallback((url: string) => {
    if (loadedRef.current.has(url)) return;
    const probe = new window.Image();
    probe.onload = () => {
      loadedRef.current.add(url);
    };
    probe.onerror = () => {
      loadedRef.current.add(url);
    };
    probe.src = url;
  }, []);

  // Swap theme immediately for UI responsiveness; crossfade gated on image readiness
  useEffect(() => {
    if (theme.id === currentThemeIdRef.current) return;

    const token = ++loadTokenRef.current;
    currentThemeIdRef.current = theme.id;

    // If we haven't mounted yet, just swap immediately without animation
    if (!isMountedRef.current) {
      setCurrentTheme(theme);
      setPrevTheme(null);
      setCurrentReady(true);
      return;
    }

    // Move current to prev, set new current
    setPrevTheme(currentTheme);
    setCurrentTheme(theme);
    setCurrentReady(false);

    // Check if already loaded
    if (loadedRef.current.has(theme.background)) {
      setCurrentReady(true);
      return;
    }

    // Load new background in background
    const probe = new window.Image();
    probe.onload = () => {
      if (loadTokenRef.current !== token) return;
      loadedRef.current.add(theme.background);
      setCurrentReady(true);
    };
    probe.onerror = () => {
      if (loadTokenRef.current !== token) return;
      loadedRef.current.add(theme.background);
      setCurrentReady(true);
    };
    probe.src = theme.background;

    return () => {
      loadTokenRef.current += 1;
    };
  }, [theme]);

  // Crossfade animation when new background is ready
  useEffect(() => {
    const current = currentLayerRef.current;
    const prev = prevLayerRef.current;
    if (!current) return;

    // On first mount, no animation needed
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      current.style.opacity = "1";
      current.style.transform = "none";
      if (prev) {
        prev.style.opacity = "0";
        prev.style.transform = "none";
      }
      return;
    }

    // Wait for new image to be ready before starting crossfade
    if (!currentReady) {
      // Keep prev layer visible, current layer hidden until ready
      current.style.opacity = "0";
      current.style.transform = "none";
      if (prev) {
        prev.style.opacity = "1";
        prev.style.transform = "none";
      }
      return;
    }

    // Resting state after transition
    current.style.opacity = "1";
    current.style.transform = "none";

    // Nothing to fade from
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
        fill: "forwards",
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

  // Expose preload function for GenrePills to use
  useEffect(() => {
    // Preload all vibe backgrounds on mount for instant transitions
    const backgrounds = [
      "/backgrounds/bg-phonk.jpg",
      "/backgrounds/lofi.png",
      "/backgrounds/bolly.jpg",
      "/backgrounds/mountains.jpg",
      "/backgrounds/chill.jpg",
      "/backgrounds/fields.jpg",
    ];
    backgrounds.forEach(preloadBackground);
  }, [preloadBackground]);

  const bgStyle = (url: string, overlay: string) => ({
    backgroundImage: `url(${url})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  } as React.CSSProperties);

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
          style={{
            ...bgStyle(prevTheme.background, prevTheme.overlay),
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: prevTheme.overlay }}
          />
        </div>
      )}

      {/* Current background layer fading in - NO key prop to prevent remount */}
      <div
        ref={currentLayerRef}
        className="absolute inset-0 z-10"
        aria-hidden="true"
        style={{
          ...bgStyle(currentTheme.background, currentTheme.overlay),
        }}
      >
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