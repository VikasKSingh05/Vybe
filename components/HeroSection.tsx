"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/cn";

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!titleRef.current) return;

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
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      className={cn(
        "flex flex-col items-center px-6 text-center select-none",
        className,
      )}
    >
      <h1
        ref={titleRef}
        className="font-display text-[clamp(4.5rem,15vw,9rem)] leading-[0.88] font-bold tracking-[-0.04em] text-white drop-shadow-2xl"
      >
        VYBE
      </h1>
    </section>
  );
}
