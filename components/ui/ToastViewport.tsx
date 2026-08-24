"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import gsap from "gsap";
import {
  subscribeToasts,
  dismissToast,
  pauseToast,
  resumeToast,
  type ToastItem,
  type ToastTone,
} from "@/lib/toast";
import { cn } from "@/lib/cn";

interface ToneConfig {
  icon: React.ComponentType<{ className?: string }>;
  chip: string;
  bar: string;
}

const TONE_CONFIG: Record<ToastTone, ToneConfig> = {
  info: {
    icon: Info,
    chip: "bg-violet-400/10 text-violet-300",
    bar: "bg-violet-400/70",
  },
  success: {
    icon: CheckCircle2,
    chip: "bg-emerald-400/10 text-emerald-300",
    bar: "bg-emerald-400/70",
  },
  error: {
    icon: AlertTriangle,
    chip: "bg-red-400/10 text-red-300",
    bar: "bg-red-400/70",
  },
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function ToastCard({ item, index }: { item: ToastItem; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // Capture mount position once — stagger applies only to the entrance
  const staggerIndex = useRef(index);
  const leavingRef = useRef(false);
  const barTween = useRef<gsap.core.Tween | null>(null);
  const exitTl = useRef<gsap.core.Timeline | null>(null);

  const tone = TONE_CONFIG[item.tone];
  const Icon = tone.icon;

  const beginExit = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    barTween.current?.kill();
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) {
      dismissToast(item.id);
      return;
    }
    // Phase 1: lift + fade. Phase 2: collapse the slot so siblings glide up.
    exitTl.current = gsap.timeline({
      onComplete: () => dismissToast(item.id),
    });
    exitTl.current.to(card, {
      opacity: 0,
      y: -10,
      scale: 0.96,
      duration: 0.18,
      ease: "power2.in",
    });
    exitTl.current.to(
      card,
      {
        height: 0,
        minHeight: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        duration: 0.26,
        ease: "power2.inOut",
      },
      ">",
    );
  }, [item.id]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    if (prefersReducedMotion()) {
      gsap.set(card, { opacity: 1, y: 0, scale: 1 });
    } else {
      gsap.set(card, { y: -16, scale: 0.95 });
      gsap.to(card, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.45,
        delay: staggerIndex.current * 0.055,
        ease: "back.out(1.7)",
      });
    }

    return () => {
      exitTl.current?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lifetime progress bar — paused/resumed in tandem with the lib countdown
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || item.durationMs <= 0) return;
    barTween.current = gsap.fromTo(
      bar,
      { scaleX: 1 },
      {
        scaleX: 0,
        duration: item.durationMs / 1000,
        ease: "none",
        onComplete: beginExit,
      },
    );
    return () => {
      barTween.current?.kill();
    };
  }, [item.durationMs, beginExit]);

  const handleMouseEnter = useCallback(() => {
    if (leavingRef.current) return;
    pauseToast(item.id);
    barTween.current?.pause();
  }, [item.id]);

  const handleMouseLeave = useCallback(() => {
    if (leavingRef.current) return;
    resumeToast(item.id);
    barTween.current?.resume();
  }, [item.id]);

  return (
    <div
      ref={cardRef}
      role="status"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ opacity: 0 }}
      className="pointer-events-auto relative mb-2 w-full max-w-sm overflow-hidden rounded-2xl shadow-[0_12px_48px_-12px_rgba(0,0,0,0.65)]"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#101010]/90 py-2.5 pl-3 pr-1.5 backdrop-blur-xl">
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full",
            tone.chip,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-white/80">
          {item.message}
        </p>
        <button
          type="button"
          onClick={beginExit}
          aria-label="Dismiss notification"
          className="group/close flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/80 cursor-pointer"
        >
          <X className="h-3.5 w-3.5 transition-transform duration-200 group-hover/close:rotate-90" />
        </button>
      </div>

      {item.durationMs > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
          <div
            ref={barRef}
            className={cn("h-full w-full origin-left", tone.bar)}
          />
        </div>
      )}
    </div>
  );
}

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const mounted = useRef(false);

  useEffect(() => {
    // Skip the initial sync emission so toasts never animate on hydration
    const unsubscribe = subscribeToasts((next) => {
      if (mounted.current) setItems(next);
    });
    mounted.current = true;
    return unsubscribe;
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex flex-col items-center px-4"
    >
      {items.map((item, i) => (
        <ToastCard key={item.id} item={item} index={i} />
      ))}
    </div>
  );
}

export default ToastViewport;
