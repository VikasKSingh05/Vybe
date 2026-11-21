"use client";

import { cn } from "@/lib/cn";

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-center px-6 text-center",
        className,
      )}
    >
      <h1
        className="animate-hero-in font-display text-[clamp(4.5rem,15vw,9rem)] leading-[0.88] font-bold tracking-[-0.04em] text-white drop-shadow-2xl"
      >
        VYBE
      </h1>
      <p className="mt-5 text-center text-[10px] font-medium tracking-[0.32em] text-white/45 uppercase sm:text-[11px]">
        VYBE LIVE · One station. One world.
      </p>
    </section>
  );
}
