"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/cn";

interface HeroSectionProps {
  vibeLabel?: string;
  className?: string;
}

export function HeroSection({ vibeLabel, className }: HeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const topLineRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bottomLineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        topLineRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
      );

      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 16, filter: "blur(4px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.9,
          delay: 0.1,
          ease: "power3.out",
        },
      );

      gsap.fromTo(
        bottomLineRef.current,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.2,
          ease: "power3.out",
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, [vibeLabel]);

  return (
    <section
      ref={containerRef}
      className={cn(
        "flex flex-col items-center px-6 text-center select-none",
        className,
      )}
    >
      {/* Top tagline — italic editorial */}
      <p
        ref={topLineRef}
        className="text-[clamp(0.95rem,2.2vw,1.25rem)] font-light italic tracking-wide text-white/70"
      >
        PICK A VIBE.
      </p>

      {/* Main title */}
      <h1
        ref={titleRef}
        className="font-display mt-3 text-[clamp(4.5rem,15vw,9rem)] leading-[0.88] font-bold tracking-[-0.04em] text-white drop-shadow-2xl sm:mt-4"
      >
        VYBE
      </h1>

      {/* Bottom tagline — italic editorial */}
      <p
        ref={bottomLineRef}
        className="mt-3 text-[clamp(0.95rem,2.2vw,1.25rem)] font-light italic tracking-wide text-white/70 sm:mt-4"
      >
        PRESS PLAY.
      </p>
    </section>
  );
}
