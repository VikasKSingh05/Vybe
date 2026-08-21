"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import type { VibeTheme } from "@/data/types";
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

  const currentLayerRef = useRef<HTMLDivElement>(null);
  const prevLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme.id === currentTheme.id) return;

    setPrevTheme(currentTheme);
    setCurrentTheme(theme);
  }, [theme, currentTheme]);

  // GSAP animation for smooth background crossfade and scale
  useEffect(() => {
    if (!currentLayerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        currentLayerRef.current!,
        { opacity: 0, scale: 1.07 },
        {
          opacity: 1,
          scale: 1.0,
          duration: 0.85,
          ease: "power2.out",
          clearProps: "transform",
        },
      );

      if (prevLayerRef.current) {
        gsap.to(prevLayerRef.current, {
          opacity: 0,
          scale: 1.04,
          duration: 0.85,
          ease: "power2.inOut",
          onComplete: () => {
            setPrevTheme(null);
          },
        });
      }
    });

    return () => ctx.revert();
  }, [currentTheme]);

  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden bg-black select-none pointer-events-none",
        className,
      )}
    >
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
