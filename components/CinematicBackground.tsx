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
 * The single VYBE LIVE broadcast has one fixed visual identity. The gradient
 * is the permanent fallback, so a failed or still-loading image never leaves
 * the page on a blank surface.
 */
export function CinematicBackground({
  theme,
  className,
}: CinematicBackgroundProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden bg-black select-none pointer-events-none",
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
            className="object-cover object-center"
            sizes="100vw"
            onError={() => setImageFailed(true)}
          />
          <div
            className="absolute inset-0"
            style={{ background: theme.overlay }}
          />
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.6) 100%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-20 mix-blend-soft-light opacity-30"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}22 0%, transparent 50%, rgba(0,0,0,0.3) 100%)`,
        }}
      />

      <div className="grain-overlay pointer-events-none absolute inset-0 z-30 opacity-[0.04]" />
    </div>
  );
}
