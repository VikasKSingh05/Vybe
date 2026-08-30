"use client";

import { useEffect, useRef } from "react";
import type { VibeId } from "@/data/types";
import { vibeThemes, getVibeTheme } from "@/data/vibes";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface GenrePillsProps {
  activeId: VibeId;
  onChange: (id: VibeId) => void;
  accent: string;
  className?: string;
  searchOverlay?: React.ReactNode;
}

const backgroundCache = new Set<string>();

function preloadBackground(url: string) {
  if (backgroundCache.has(url)) return;
  const img = new window.Image();
  img.onload = () => backgroundCache.add(url);
  img.onerror = () => backgroundCache.add(url);
  img.src = url;
}

export function GenrePills({
  activeId,
  onChange,
  accent,
  className,
  searchOverlay,
}: GenrePillsProps) {
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeBtn = pillsRef.current?.querySelector<HTMLButtonElement>(
      `[data-vibe-id="${activeId}"]`,
    );
    if (!activeBtn || prefersReducedMotion()) return;
    const anim = activeBtn.animate(
      [{ transform: "scale(0.95)" }, { transform: "scale(1)" }],
      { duration: 350, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
    return () => anim.cancel();
  }, [activeId]);

  const handleVibeHover = (vibeId: VibeId) => {
    const theme = getVibeTheme(vibeId);
    preloadBackground(theme.background);
  };

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8",
        className,
      )}
    >
      <div
        ref={pillsRef}
        role="radiogroup"
        aria-label="Select vibe"
        className="flex flex-wrap items-center justify-center gap-2 py-2 px-1"
      >
{vibeThemes.map((vibe) => {
            const isActive = vibe.id === activeId;
            return (
              <button
                key={vibe.id}
                data-vibe-id={vibe.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-label={`${vibe.label} vibe${isActive ? " (selected)" : ""}`}
                onClick={() => onChange(vibe.id)}
                onMouseEnter={() => handleVibeHover(vibe.id)}
                onFocus={() => handleVibeHover(vibe.id)}
                className={cn(
                "group relative shrink-0 rounded-full px-4 py-2.5 min-h-[44px] text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-300 ease-out cursor-pointer",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                isActive
                  ? "border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-md"
                  : "border border-white/5 bg-black/20 text-white/60 hover:border-white/15 hover:bg-white/10 hover:text-white/90 hover:-translate-y-0.5",
              )}
              style={
                isActive
                  ? {
                      boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 16px ${accent}44, inset 0 0 0 1px ${accent}66`,
                    }
                  : undefined
              }
            >
              {/* Subtle active pill dot indicator */}
              {isActive && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full mr-2 transition-all"
                  style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
                />
              )}
              <span>{vibe.label}</span>
            </button>
          );
        })}
      </div>

      {activeId === "random" && searchOverlay && (
        <div className="mt-1 flex justify-center">
          <div className="w-full max-w-xl">{searchOverlay}</div>
        </div>
      )}
    </div>
  );
}
