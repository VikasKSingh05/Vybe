"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

interface UseFocusTrapOptions {
  containerRef: RefObject<HTMLElement | null>;
  active: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Set false when the consumer manages its own focus restoration. */
  restoreFocus?: boolean;
}

/**
 * Traps Tab navigation inside a dialog container while `active`, focuses the
 * initial target on activation (falling back to the first focusable element),
 * and restores focus to the previously-focused element on deactivation.
 */
export function useFocusTrap({
  containerRef,
  active,
  initialFocusRef,
  restoreFocus = true,
}: UseFocusTrapOptions): void {
  const restoreTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;

    if (restoreFocus) {
      restoreTargetRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }

    const initialTarget = initialFocusRef?.current ?? null;
    if (initialTarget) {
      initialTarget.focus();
    } else if (container) {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const c = containerRef.current;
      if (!c) return;
      const focusables = Array.from(
        c.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const current = document.activeElement;
      const inside = c.contains(current);

      if (e.shiftKey) {
        if (current === firstEl || !inside) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (current === lastEl || !inside) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (restoreFocus && restoreTargetRef.current) {
        restoreTargetRef.current.focus();
        restoreTargetRef.current = null;
      }
    };
    // Ref objects are stable; re-running only on `active` keeps the captured
    // restore target from being overwritten by unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
