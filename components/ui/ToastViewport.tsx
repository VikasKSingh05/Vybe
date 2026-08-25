"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import {
  subscribeToasts,
  dismissToast,
  pauseToast,
  resumeToast,
  type ToastItem,
  type ToastTone,
} from "@/lib/toast";
import { prefersReducedMotion } from "@/lib/motion";
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

function ToastCard({ item, index }: { item: ToastItem; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // Capture mount position once — stagger applies only to the entrance
  const staggerIndex = useRef(index);
  const leavingRef = useRef(false);
  const enterAnimRef = useRef<Animation | null>(null);
  const barAnimRef = useRef<Animation | null>(null);
  const exitAnimsRef = useRef<Animation[]>([]);

  const tone = TONE_CONFIG[item.tone];
  const Icon = tone.icon;

  const beginExit = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    barAnimRef.current?.cancel();
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) {
      dismissToast(item.id);
      return;
    }
    // Phase 1: lift + fade. Phase 2: collapse the slot so siblings glide up.
    const phase1 = card.animate(
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(-10px) scale(0.96)" },
      ],
      {
        duration: 180,
        easing: "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
        fill: "forwards",
      },
    );
    exitAnimsRef.current = [phase1];
    phase1.finished
      .then(() => {
        if (leavingRef.current === false) return;
        const height = card.getBoundingClientRect().height;
        const phase2 = card.animate(
          [
            { height: `${height}px`, minHeight: `${height}px`, marginBottom: "8px" },
            { height: "0px", minHeight: "0px", marginBottom: "0px" },
          ],
          {
            duration: 260,
            easing: "cubic-bezier(0.455, 0.03, 0.515, 0.955)",
            fill: "forwards",
          },
        );
        exitAnimsRef.current = [phase1, phase2];
        return phase2.finished;
      })
      .then(() => {
        if (leavingRef.current) dismissToast(item.id);
      })
      .catch(() => {});
  }, [item.id]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    if (prefersReducedMotion()) {
      card.style.opacity = "1";
    } else {
      enterAnimRef.current = card.animate(
        [
          { opacity: 0, transform: "translateY(-16px) scale(0.95)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        {
          duration: 450,
          delay: staggerIndex.current * 55,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          fill: "both",
        },
      );
    }

    return () => {
      enterAnimRef.current?.cancel();
      exitAnimsRef.current.forEach((a) => a.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lifetime progress bar — paused/resumed in tandem with the lib countdown
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || item.durationMs <= 0) return;
    const anim = bar.animate(
      [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
      { duration: item.durationMs, easing: "linear", fill: "forwards" },
    );
    anim.onfinish = () => beginExit();
    barAnimRef.current = anim;
    return () => {
      anim.onfinish = null;
      anim.cancel();
    };
  }, [item.durationMs, beginExit]);

  const handleMouseEnter = useCallback(() => {
    if (leavingRef.current) return;
    pauseToast(item.id);
    barAnimRef.current?.pause();
  }, [item.id]);

  const handleMouseLeave = useCallback(() => {
    if (leavingRef.current) return;
    resumeToast(item.id);
    const bar = barAnimRef.current;
    // Native play() restarts finished animations — only resume paused ones.
    if (bar && bar.playState === "paused") bar.play();
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
