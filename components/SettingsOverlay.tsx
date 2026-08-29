"use client";

import { useEffect, useRef } from "react";
import { X, Repeat, Shuffle, Waves, Music2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { RepeatMode } from "@/lib/player-modes";

interface SettingsOverlayProps {
  isOpen: boolean;
  accent: string;
  crossfadeEnabled: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  onClose: () => void;
  onToggleCrossfade: () => void;
  onRepeatModeChange: (mode: RepeatMode) => void;
  onToggleShuffle: () => void;
}

const REPEAT_MODES: { value: RepeatMode; label: string; title: string }[] = [
  { value: "off", label: "Off", title: "Stop after the queue ends" },
  { value: "one", label: "One", title: "Repeat the current track" },
  { value: "all", label: "All", title: "Repeat the whole queue" },
];

export function SettingsOverlay({
  isOpen,
  accent,
  crossfadeEnabled,
  repeatMode,
  shuffle,
  onClose,
  onToggleCrossfade,
  onRepeatModeChange,
  onToggleShuffle,
}: SettingsOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useFocusTrap({
    containerRef: panelRef,
    active: isOpen,
    initialFocusRef: closeBtnRef,
  });

  // Slide-up sheet animation (mirrors QueueOverlay's pattern).
  useEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    if (prefersReducedMotion()) {
      panel.style.transform = isOpen ? "translateY(0)" : "translateY(100%)";
      backdrop.style.opacity = isOpen ? "1" : "0";
      return;
    }

    const anims: Animation[] = isOpen
      ? [
          backdrop.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 250, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", fill: "forwards" },
          ),
          panel.animate(
            [{ transform: "translateY(100%)" }, { transform: "translateY(0%)" }],
            { duration: 400, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)", fill: "forwards" },
          ),
        ]
      : [
          panel.animate(
            [{ transform: "translateY(0%)" }, { transform: "translateY(100%)" }],
            { duration: 300, easing: "cubic-bezier(0.55, 0.085, 0.68, 0.53)", fill: "forwards" },
          ),
          backdrop.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 250, easing: "cubic-bezier(0.55, 0.085, 0.68, 0.53)", fill: "forwards" },
          ),
        ];
    return () => anims.forEach((a) => a.cancel());
  }, [isOpen]);

  // Escape to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[65] flex flex-col justify-end",
        !isOpen && "pointer-events-none",
      )}
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className="relative max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#0d0d0d]/95 backdrop-blur-xl shadow-2xl scrollbar-hide pb-[env(safe-area-inset-bottom)]"
        style={{ transform: "translateY(100%)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Music2 className="h-4 w-4 text-white/40" />
            <h2 className="text-sm font-semibold tracking-wide text-white/90">
              Settings
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col">

          {/* Playback order */}
          <section className="flex flex-col gap-3 px-5 py-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Playback order
            </h3>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Repeat className="h-4 w-4 text-white/40" />
                <span className="text-sm text-white/90">Repeat</span>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                {REPEAT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    title={mode.title}
                    onClick={() => onRepeatModeChange(mode.value)}
                    aria-pressed={repeatMode === mode.value}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer min-h-[36px]",
                      repeatMode === mode.value
                        ? "text-black"
                        : "text-white/50 hover:text-white/80",
                    )}
                    style={
                      repeatMode === mode.value
                        ? { backgroundColor: accent }
                        : undefined
                    }
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Shuffle className="h-4 w-4 text-white/40" />
                <span className="text-sm text-white/90">Shuffle</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Shuffle"
                aria-checked={shuffle}
                onClick={onToggleShuffle}
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors cursor-pointer",
                  shuffle ? "text-black" : "bg-white/15",
                )}
                style={shuffle ? { backgroundColor: accent } : undefined}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 h-5 w-5 rounded-full transition-transform",
                    shuffle ? "translate-x-5 bg-black" : "bg-white/60",
                  )}
                />
              </button>
            </div>
          </section>

          {/* Crossfade */}
          <section className="flex flex-col gap-3 border-t border-white/5 px-5 py-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Crossfade
            </h3>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Waves className="h-4 w-4 text-white/40" />
                <span className="text-sm text-white/90">Enable crossfade</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Enable crossfade"
                aria-checked={crossfadeEnabled}
                onClick={onToggleCrossfade}
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors cursor-pointer",
                  crossfadeEnabled ? "text-black" : "bg-white/15",
                )}
                style={crossfadeEnabled ? { backgroundColor: accent } : undefined}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 h-5 w-5 rounded-full transition-transform",
                    crossfadeEnabled ? "translate-x-5 bg-black" : "bg-white/60",
                  )}
                />
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

