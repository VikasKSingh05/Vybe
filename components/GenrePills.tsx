"use client";

import type { VibeId } from "@/data/types";
import { vibeThemes } from "@/data/vibes";
import { cn } from "@/lib/cn";

interface GenrePillsProps {
  activeId: VibeId;
  onChange: (id: VibeId) => void;
  accent: string;
  className?: string;
}

export function GenrePills({
  activeId,
  onChange,
  accent,
  className,
}: GenrePillsProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-3xl px-5 md:px-8",
        className,
      )}
    >
      <div className="scrollbar-hide flex items-center justify-center gap-2 overflow-x-auto pb-2 md:gap-2.5">
        {vibeThemes.map((vibe) => {
          const isActive = vibe.id === activeId;
          return (
            <button
              key={vibe.id}
              type="button"
              onClick={() => onChange(vibe.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[10px] font-medium tracking-[0.2em] uppercase transition-all duration-300 ease-out",
                "border border-transparent",
                isActive
                  ? "border-white/15 bg-white/12 text-white shadow-[0_4px_24px_rgba(0,0,0,0.2)] backdrop-blur-sm"
                  : "text-white/40 hover:translate-y-[-1px] hover:bg-white/6 hover:text-white/70",
              )}
              style={
                isActive
                  ? {
                      boxShadow: `0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px ${accent}33`,
                    }
                  : undefined
              }
            >
              {vibe.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
