"use client";

import { useState } from "react";
import Image from "next/image";
import type { VibeTheme } from "@/data/types";
import { cn } from "@/lib/cn";

interface CinematicBackgroundProps {
  theme: VibeTheme;
  className?: string;
}

/**
 * The single VYBE LIVE broadcast has one fixed visual identity. Layers build a
 * cinematic stage: artwork, a warm signal wash, a readability gradient, then
 * vignette + grain. The gradient is permanent, so a failed or still-loading
 * image never leaves the page on a blank surface.
 */
export function CinematicBackground({
  theme,
  className,
}: CinematicBackgroundProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden bg-ink select-none pointer-events-none",
        className,
      )}
    >
      <div
        className="absolute inset-0 z-0"
        style={{ background: theme.overlay }}
        aria-hidden="true"
      />

      {!imageFailed ? (
        <div className="absolute inset-0 z-10" aria-hidden="true">
          <Image
            src={theme.background}
            alt=""
            fill
            priority
            className="scale-[1.04] object-cover object-center opacity-70 blur-[0.5px]"
            sizes="100vw"
            onError={() => setImageFailed(true)}
          />
          <div
            className="absolute inset-0 mix-blend-soft-light opacity-70"
            style={{
              background: `radial-gradient(circle at 72% 22%, ${theme.accent}55 0%, transparent 46%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: theme.overlay }}
          />
        </div>
      ) : null}

      <div
        className="absolute inset-0 z-20"
        style={{
          background: `linear-gradient(90deg, rgba(9,9,10,0.88) 0%, rgba(9,9,10,0.45) 48%, rgba(9,9,10,0.72) 100%)`,
        }}
      />

      <div
        className="absolute inset-0 z-20"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      <div className="grain-overlay absolute inset-0 z-30 opacity-[0.06]" />
      <div
        className="scanlines absolute inset-0 z-30 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(244,239,230,0.14) 0px, rgba(244,239,230,0.14) 1px, transparent 1px, transparent 4px)",
        }}
      />
    </div>
  );
}
