"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { VibeTheme } from "@/data/types";
import { cn } from "@/lib/cn";

interface CinematicBackgroundProps {
  theme: VibeTheme;
  className?: string;
}

function BackgroundLayer({
  vibe,
  isVisible,
  isEntering,
}: {
  vibe: VibeTheme;
  isVisible: boolean;
  isEntering: boolean;
}) {
  const [entered, setEntered] = useState(!isEntering);

  useEffect(() => {
    if (!isEntering) {
      setEntered(true);
      return;
    }
    setEntered(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [isEntering, vibe.id]);

  return (
    <div
      className={cn(
        "absolute inset-0 transition-all duration-[850ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        isVisible && entered
          ? "scale-100 opacity-100"
          : "scale-[1.05] opacity-0",
      )}
      aria-hidden
    >
      <Image
        src={vibe.background}
        alt=""
        fill
        priority={vibe.id === "all"}
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0" style={{ background: vibe.overlay }} />
    </div>
  );
}

export function CinematicBackground({ theme, className }: CinematicBackgroundProps) {
  const [current, setCurrent] = useState(theme);
  const [previous, setPrevious] = useState<VibeTheme | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (theme.id === current.id) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setPrevious(current);
    setCurrent(theme);

    timeoutRef.current = setTimeout(() => {
      setPrevious(null);
    }, 900);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [theme, current]);

  return (
    <div className={cn("fixed inset-0 -z-10 overflow-hidden", className)}>
      {previous && (
        <BackgroundLayer vibe={previous} isVisible={false} isEntering={false} />
      )}
      <BackgroundLayer
        key={current.id}
        vibe={current}
        isVisible
        isEntering={!!previous}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.045]" />

      <div
        className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-30 transition-colors duration-[850ms]"
        style={{
          background: `linear-gradient(135deg, ${current.accent}22 0%, transparent 50%, rgba(0,0,0,0.2) 100%)`,
        }}
      />
    </div>
  );
}
