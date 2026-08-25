"use client";

import { useEffect, useRef } from "react";
import type { PartyReaction } from "@/lib/party/types";
import { diffNewReactions } from "@/lib/party/reaction-diff";

const MAX_CONCURRENT_BURSTS = 12;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

interface ReactionBurstProps {
  reactions: PartyReaction[];
}

/**
 * Decorative layer anchored inside the reactions bar. Watches the shared
 * reaction list and floats a copy of every new emoji upward, so everyone
 * sees everyone's reactions in real time. Purely visual: aria-hidden,
 * pointer-events-none, and fully inert under prefers-reduced-motion.
 */
export function ReactionBurst({ reactions }: ReactionBurstProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const activeCountRef = useRef(0);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // First observation only seeds the known set — joining mid-party
    // shouldn't replay the previous 30 seconds of reactions.
    if (!seededRef.current) {
      seededRef.current = true;
      diffNewReactions(reactions, knownIdsRef.current);
      return;
    }

    const fresh = diffNewReactions(reactions, knownIdsRef.current);
    if (fresh.length === 0) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    for (const reaction of fresh) {
      spawnBurst(containerRef.current, reaction.emoji, activeCountRef);
    }
  }, [reactions]);

  useEffect(() => {
    const container = containerRef.current;
    return () => {
      if (!container) return;
      container.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      container.replaceChildren();
      activeCountRef.current = 0;
      knownIdsRef.current = new Set();
      seededRef.current = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-1 z-10 h-0"
    />
  );
}

function spawnBurst(
  container: HTMLDivElement,
  emoji: string,
  activeCount: { current: number },
): void {
  if (activeCount.current >= MAX_CONCURRENT_BURSTS) return;

  const el = document.createElement("span");
  el.textContent = emoji;
  el.style.cssText = [
    "position:absolute",
    "bottom:0",
    `left:${12 + Math.random() * 76}%`,
    `font-size:${Math.round(19 + Math.random() * 11)}px`,
    "line-height:1",
    "will-change:transform,opacity",
  ].join(";");
  container.appendChild(el);
  activeCount.current += 1;

  const riseY = -(90 + Math.random() * 70);
  const driftX = (Math.random() - 0.5) * 60;
  const rotation = (Math.random() - 0.5) * 50;
  const riseDuration = 2.2 + Math.random() * 0.8;
  const popDuration = 300;
  const delay = Math.random() * 150;

  // Pop-in (back.out) then long drift upward, expressed as one keyframed
  // animation with per-segment easing.
  const anim = el.animate(
    [
      {
        transform: "translate(0px, 0px) scale(0.4) rotate(0deg)",
        opacity: 0,
        offset: 0,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      {
        transform: `translate(${driftX * 0.15}px, ${riseY * 0.12}px) scale(1.15) rotate(${rotation * 0.3}deg)`,
        opacity: 1,
        offset: popDuration / (popDuration + riseDuration * 1000),
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      {
        transform: `translate(${driftX}px, ${riseY}px) scale(1) rotate(${rotation}deg)`,
        opacity: 0,
        offset: 1,
      },
    ],
    { duration: popDuration + riseDuration * 1000, delay },
  );
  anim.onfinish = () => {
    el.remove();
    activeCount.current -= 1;
  };
}
