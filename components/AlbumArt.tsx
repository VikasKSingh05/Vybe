"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

interface AlbumArtProps {
  src?: string;
  title: string;
  accent: string;
  size?: "sm" | "md";
  className?: string;
}

export function AlbumArt({
  src,
  title,
  accent,
  size = "md",
  className,
}: AlbumArtProps) {
  const [hasError, setHasError] = useState(false);
  const dimensions = size === "sm" ? 44 : 56;

  // Reset error state when src changes
  if (hasError && src) {
    // reset synchronously on prop change pattern
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg",
        size === "sm" ? "h-11 w-11" : "h-14 w-14",
        className,
      )}
      style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22` }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${accent}cc 0%, ${accent}55 50%, rgba(0,0,0,0.7) 100%)`,
        }}
      >
        <span className="text-[10px] font-medium tracking-wider text-white/90 uppercase">
          {title.slice(0, 2)}
        </span>
      </div>

      {!hasError && src && (
        <Image
          key={src}
          src={src}
          alt={`${title} artwork`}
          width={dimensions}
          height={dimensions}
          unoptimized
          className="relative h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
