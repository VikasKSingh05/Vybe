"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

const FALLBACK_ARTWORK = "/covers/default.jpg";

interface AlbumArtProps {
  src?: string;
  title: string;
  accent: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AlbumArt({
  src,
  title,
  accent,
  size = "md",
  className,
}: AlbumArtProps) {
  const dimensions = size === "sm" ? 44 : size === "lg" ? 120 : 56;

  // Reset the "failed" flag whenever the incoming src changes, using React's
  // derived-state-during-render pattern (avoids a setState-in-effect cascade).
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setFailedSrc(null);
  }

  const currentSrc = failedSrc === src && src ? FALLBACK_ARTWORK : src;

  const handleError = () => {
    if (currentSrc && currentSrc !== FALLBACK_ARTWORK) {
      setFailedSrc(src ?? null);
    }
  };

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg",
        size === "sm" ? "h-11 w-11" : size === "lg" ? "h-[120px] w-[120px] rounded-2xl" : "h-14 w-14",
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

      {currentSrc && (
        <Image
          key={currentSrc}
          src={currentSrc}
          alt={`${title} artwork`}
          width={dimensions}
          height={dimensions}
          sizes="(max-width: 640px) 44px, (max-width: 1024px) 56px, 120px"
          unoptimized
          className="relative h-full w-full object-cover"
          onError={handleError}
        />
      )}
    </div>
  );
}
