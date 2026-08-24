"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  subscribeToasts,
  dismissToast,
  type ToastItem,
  type ToastTone,
} from "@/lib/toast";
import { cn } from "@/lib/cn";

const TONE_STYLES: Record<ToastTone, { dot: string; label: string }> = {
  info: { dot: "bg-white/50", label: "text-white/80" },
  success: { dot: "bg-emerald-400", label: "text-emerald-100/90" },
  error: { dot: "bg-red-400", label: "text-red-100/90" },
};

function ToastCard({ item }: { item: ToastItem }) {
  const [leaving, setLeaving] = useState(false);
  const tone = TONE_STYLES[item.tone];

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => dismissToast(item.id), 180);
  };

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-white/10 bg-[#0d0d0d]/95 py-2.5 pl-3.5 pr-2 shadow-2xl backdrop-blur-xl transition-all duration-200 animate-fade-in",
        leaving
          ? "translate-y-[-8px] opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tone.dot)} />
      <p className={cn("min-w-0 flex-1 text-xs leading-relaxed", tone.label)}>
        {item.message}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="flex min-h-[32px] min-w-[32px] shrink-0 items-center justify-center rounded-full p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70 cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
      className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export default ToastViewport;
