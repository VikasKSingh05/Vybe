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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 16, filter: "blur(4px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.9,
          ease: "power3.out",
        },
      );

      gsap.fromTo(
        taglineRef.current,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay: 0.15,
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
        "flex flex-col items-center px-6 pt-24 pb-8 text-center sm:pt-28 md:pt-36 md:pb-12 select-none",
        className,
      )}
    >
      <h1
        ref={titleRef}
        className="font-display text-[clamp(4rem,14vw,8.5rem)] leading-[0.88] font-bold tracking-[-0.05em] text-white drop-shadow-2xl"
      >
        VYBE
      </h1>

      <p
        ref={taglineRef}
        className="mt-5 max-w-xs text-[clamp(0.95rem,2.2vw,1.15rem)] font-light tracking-wide text-white/70 sm:mt-6 sm:max-w-none"
      >
        Pick a vibe.
        <br className="sm:hidden" />
        <span className="sm:ml-1.5">Press play.</span>
      </p>
    </section>
  );
}
