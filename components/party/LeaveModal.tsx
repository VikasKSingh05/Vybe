"use client";

import { useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import gsap from "gsap";

interface LeaveModalProps {
  onStay: () => void;
  onLeave: () => void;
}

export function LeaveModal({ onStay, onLeave }: LeaveModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Capture the opener BEFORE taking focus so unmount can hand it back.
    const prev = document.activeElement as HTMLElement | null;
    stayRef.current?.focus();

    if (dialogRef.current) {
      gsap.fromTo(dialogRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: "power2.out" });
    }
    if (backdropRef.current) {
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
    }

    return () => prev?.focus();
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onStay();
        return;
      }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [onStay]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onStay}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111]/95 p-6 text-center shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-400/10">
          <LogOut className="h-5 w-5 text-red-300" />
        </div>
        <h3 id="leave-dialog-title" className="text-lg font-semibold text-white">
          Leave the party?
        </h3>
        <p className="mt-2 text-sm text-white/50">
          You&apos;ll give up your spot and return to VYBE.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            ref={stayRef}
            type="button"
            onClick={onStay}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 cursor-pointer"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 rounded-xl bg-red-400/90 px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-red-400 cursor-pointer"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
