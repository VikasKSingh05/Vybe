"use client";

import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
  onTogglePlay: () => void;
  /** Relative seek in seconds (negative = backward). */
  onSeek: (deltaSeconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleMute: () => void;
}

const SEEK_STEP_S = 5;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.getAttribute("contenteditable")) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Space/arrows natively activate focused buttons, links and sliders —
 * let the browser win so a single press never double-triggers.
 */
function isActivatingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (
    tag === "BUTTON" ||
    tag === "A" ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT"
  ) {
    return true;
  }
  const role = target.getAttribute("role");
  return (
    role === "slider" ||
    role === "button" ||
    role === "switch" ||
    role === "option" ||
    role === "tab"
  );
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      // Never hijack browser/OS combos
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target;
      if (isTypingTarget(target)) return;

      switch (e.key) {
        case " ":
        case "Spacebar":
          if (isActivatingElement(target)) return;
          e.preventDefault();
          handlersRef.current.onTogglePlay();
          break;
        case "ArrowLeft":
          if (isActivatingElement(target)) return;
          e.preventDefault();
          handlersRef.current.onSeek(-SEEK_STEP_S);
          break;
        case "ArrowRight":
          if (isActivatingElement(target)) return;
          e.preventDefault();
          handlersRef.current.onSeek(SEEK_STEP_S);
          break;
        case "n":
        case "N":
          handlersRef.current.onNext();
          break;
        case "p":
        case "P":
          handlersRef.current.onPrev();
          break;
        case "m":
        case "M":
          handlersRef.current.onToggleMute();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
