"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
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
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pillsRef.current) return;

    const ctx = gsap.context(() => {
      const activeBtn = pillsRef.current?.querySelector(
        `[data-vibe-id="${activeId}"]`,
      );
      if (activeBtn) {
        gsap.fromTo(
          activeBtn,
          { scale: 0.95 },
          { scale: 1, duration: 0.35, ease: "back.out(1.7)" },
        );
      }
    }, pillsRef);

    return () => ctx.revert();
  }, [activeId]);

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8 select-none",
        className,
      )}
    >
      <div
        ref={pillsRef}
        className="scrollbar-hide flex items-center justify-start sm:justify-center gap-2 overflow-x-auto py-2 px-1 scroll-smooth"
      >
        {vibeThemes.map((vibe) => {
          const isActive = vibe.id === activeId;
          return (
            <button
              key={vibe.id}
              data-vibe-id={vibe.id}
              type="button"
              onClick={() => onChange(vibe.id)}
              className={cn(
                "group relative shrink-0 rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-300 ease-out cursor-pointer",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                isActive
                  ? "border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-md"
                  : "border border-white/5 bg-black/20 text-white/50 hover:border-white/15 hover:bg-white/10 hover:text-white/85 hover:-translate-y-0.5",
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
    </div>
  );
}
