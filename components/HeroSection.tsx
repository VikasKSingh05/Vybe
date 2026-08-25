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
    </section>
  );
}
