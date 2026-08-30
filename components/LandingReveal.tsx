"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

interface LandingRevealProps {
  accent: string;
}

const HOLD_MS = 900;
const FADE_MS = 600;

/**
 * A one-shot branded splash that covers the first client paint (VybeApp mounts
 * client-side) so the app's content — including any initial render artifacts
 * like a brief queue panel — is revealed cleanly behind it. Dismisses itself.
 */
export function LandingReveal({ accent }: LandingRevealProps) {
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLHeadingElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const mark = markRef.current;
    const glow = glowRef.current;
    if (!root || !mark || !glow) return;

    if (prefersReducedMotion()) {
      // Skip the choreography entirely — reveal immediately.
      setDone(true);
      return;
    }

    const markIn = mark.animate(
      [
        { opacity: 0, transform: "translateY(18px) scale(0.92)", filter: "blur(10px)" },
        { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
      ],
      { duration: 900, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)", fill: "forwards" },
    );

    const glowIn = glow.animate(
      [
        { opacity: 0, transform: "scale(1.3)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 1200, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", fill: "forwards" },
    );

    const out = () => {
      const markOut = mark.animate(
        [
          { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
          { opacity: 0, transform: "translateY(-16px) scale(1.04)", filter: "blur(8px)" },
        ],
        { duration: FADE_MS, easing: "cubic-bezier(0.55, 0.085, 0.68, 0.53)", fill: "forwards" },
      );
      const backdropOut = root.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: FADE_MS, easing: "ease-out", fill: "forwards" },
      );
      backdropOut.finished
        .then(() => {
          root.style.display = "none";
          setDone(true);
        })
        .catch(() => {});
      return () => {
        markOut.cancel();
        backdropOut.cancel();
      };
    };

    const timer = setTimeout(out, HOLD_MS);

    return () => {
      clearTimeout(timer);
      markIn.cancel();
      glowIn.cancel();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#050506" }}
      aria-hidden="true"
    >
      {/* Ambient accent glow */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute h-[70vmin] w-[70vmin] rounded-full blur-[120px]"
        style={{
          background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
        }}
      />
      <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.05]" />

      <h1
        ref={markRef}
        className="font-display font-bold tracking-[-0.04em] text-white drop-shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
        style={{
          fontSize: "clamp(5rem, 20vw, 11rem)",
          lineHeight: 0.9,
          textShadow: `0 0 48px ${accent}88`,
        }}
      >
        VYBE
      </h1>
    </div>
  );
}
