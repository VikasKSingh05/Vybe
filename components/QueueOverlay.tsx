"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Music, Trash2, GripVertical } from "lucide-react";
import type { QueueItem } from "@/data/types";
import { AlbumArt } from "@/components/AlbumArt";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { prefersReducedMotion } from "@/lib/motion";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/cn";

interface QueueOverlayProps {
  queue: QueueItem[];
  currentIndex: number;
  accent: string;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (index: number) => void;
  onPlayItem: (index: number) => void;
  onClear?: () => void;
  onReorder?: (from: number, to: number) => void;
}

interface DragState {
  pointerId: number;
  startIndex: number;
  startY: number;
  targetIndex: number;
  activated: boolean;
  rects: { top: number; height: number }[];
}

const DRAG_ACTIVATE_PX = 6;
const AUTO_SCROLL_EDGE_PX = 48;
const AUTO_SCROLL_MAX_SPEED = 12; // px per frame at the very edge

// Fixed equalizer-bar heights (px). Constant values keep the "now playing"
// indicator from re-randomizing and jittering on every render.
const PLAYING_BAR_HEIGHTS = [10, 6, 8];

export function QueueOverlay({
  queue,
  currentIndex,
  accent,
  isOpen,
  onClose,
  onRemove,
  onPlayItem,
  onClear,
  onReorder,
}: QueueOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const prevIsOpen = useRef(isOpen);
  const listRef = useRef<HTMLUListElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const dragState = useRef<DragState | null>(null);
  const autoScroll = useRef<{ raf: number | null; velocity: number }>({
    raf: null,
    velocity: 0,
  });
  const [moveNote, setMoveNote] = useState("");

  const canReorder = Boolean(onReorder) && queue.length > 1;

  useFocusTrap({
    containerRef: panelRef,
    active: isOpen,
    initialFocusRef: closeBtnRef,
  });

  const stopAutoScroll = useCallback(() => {
    const s = autoScroll.current;
    if (s.raf !== null) cancelAnimationFrame(s.raf);
    s.raf = null;
    s.velocity = 0;
  }, []);

  const startAutoScrollLoop = useCallback(() => {
    if (autoScroll.current.raf !== null) return;
    const step = () => {
      const scroller = scrollerRef.current;
      const s = autoScroll.current;
      if (!scroller || s.velocity === 0) {
        s.raf = null;
        return;
      }
      scroller.scrollTop += s.velocity;
      s.raf = requestAnimationFrame(step);
    };
    autoScroll.current.raf = requestAnimationFrame(step);
  }, []);

  // Edge proximity → scroll velocity. The cached-rect drag math is
  // scroll-invariant (dragged row and sibling rows shift equally), so no
  // rect recomputation is needed while auto-scrolling.
  const updateAutoScroll = useCallback(
    (clientY: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const distTop = clientY - rect.top;
      const distBottom = rect.bottom - clientY;
      let velocity = 0;
      if (distTop >= 0 && distTop < AUTO_SCROLL_EDGE_PX) {
        velocity = -(1 - distTop / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_SPEED;
      } else if (distBottom >= 0 && distBottom < AUTO_SCROLL_EDGE_PX) {
        velocity =
          (1 - distBottom / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_SPEED;
      }
      autoScroll.current.velocity = velocity;
      if (velocity !== 0) startAutoScrollLoop();
    },
    [startAutoScrollLoop],
  );

  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  useEffect(() => {
    // Only animate when the open state actually changes. This never runs on the
    // initial mount (even under React StrictMode's double effect invocation),
    // keeping the queue deterministically hidden until the user opens it.
    if (prevIsOpen.current === isOpen) {
      prevIsOpen.current = isOpen;
      return;
    }
    prevIsOpen.current = isOpen;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    // Inline styles keep the closed state; every transition defines both
    // endpoints explicitly, so cancelling a finished animation never flickers.
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

  useEffect(() => {
    if (!isOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const clearDragStyles = useCallback(() => {
    rowRefs.current.forEach((el) => {
      if (!el) return;
      el.style.transform = "";
      el.style.transition = "";
      el.style.zIndex = "";
      el.style.boxShadow = "";
    });
  }, []);

  // Reset any leftover drag styles when the overlay closes mid-gesture
  useEffect(() => {
    if (isOpen) return;
    clearDragStyles();
    stopAutoScroll();
    dragState.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const activateDrag = useCallback((ds: DragState, dragged: HTMLLIElement) => {
    ds.activated = true;
    dragged.style.transition = "none";
    dragged.style.zIndex = "10";
    dragged.style.boxShadow = "0 12px 32px rgba(0,0,0,0.5)";
  }, []);

  const handleDragStart = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!canReorder || dragState.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const ul = listRef.current;
      if (!ul) return;

      const lis = Array.from(ul.children) as HTMLLIElement[];
      const rects = lis.map((li) => {
        const r = li.getBoundingClientRect();
        return { top: r.top, height: r.height };
      });

      dragState.current = {
        pointerId: e.pointerId,
        startIndex: index,
        startY: e.clientY,
        targetIndex: index,
        activated: false,
        rects,
      };

      e.currentTarget.setPointerCapture(e.pointerId);
      // Keep text selection / native scroll from hijacking the gesture
      e.preventDefault();
    },
    [canReorder],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const ds = dragState.current;
      if (!ds || ds.pointerId !== e.pointerId) return;
      const dragged = rowRefs.current[ds.startIndex];
      if (!dragged) return;

      const dy = e.clientY - ds.startY;
      if (!ds.activated) {
        if (Math.abs(dy) < DRAG_ACTIVATE_PX) return;
        activateDrag(ds, dragged);
      }

      updateAutoScroll(e.clientY);
      dragged.style.transform = `translateY(${dy}px)`;

      const startRect = ds.rects[ds.startIndex];
      const draggedCenter = startRect.top + startRect.height / 2 + dy;
      let target = ds.startIndex;
      if (dy > 0) {
        for (let i = ds.startIndex + 1; i < ds.rects.length; i++) {
          if (draggedCenter > ds.rects[i].top + ds.rects[i].height) target = i;
          else break;
        }
      } else {
        for (let i = ds.startIndex - 1; i >= 0; i--) {
          if (draggedCenter < ds.rects[i].top) target = i;
          else break;
        }
      }

      if (target !== ds.targetIndex) {
        ds.targetIndex = target;
        rowRefs.current.forEach((el, i) => {
          if (!el || i === ds.startIndex) return;
          let shift = 0;
          if (ds.startIndex < target && i > ds.startIndex && i <= target) {
            shift = -startRect.height;
          } else if (ds.startIndex > target && i >= target && i < ds.startIndex) {
            shift = startRect.height;
          }
          el.style.transition = "transform 150ms ease";
          el.style.transform = shift ? `translateY(${shift}px)` : "";
        });
      }
    },
    [activateDrag, updateAutoScroll],
  );

  const handleDragEnd = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const ds = dragState.current;
      if (!ds || ds.pointerId !== e.pointerId) return;
      dragState.current = null;
      clearDragStyles();
      stopAutoScroll();
      if (e.type === "pointercancel" || !ds.activated) return;
      if (ds.targetIndex !== ds.startIndex) {
        onReorder?.(ds.startIndex, ds.targetIndex);
      }
    },
    [clearDragStyles, stopAutoScroll, onReorder],
  );

  const handleGripKeyDown = useCallback(
    (index: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      e.stopPropagation();
      if (!onReorder || queue.length <= 1) return;
      const target = e.key === "ArrowUp" ? index - 1 : index + 1;
      if (target < 0 || target >= queue.length) return;
      onReorder(index, target);
      setMoveNote(
        `${queue[index].title} moved to position ${target + 1} of ${queue.length}`,
      );
    },
    [onReorder, queue],
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col justify-end",
        !isOpen && "pointer-events-none invisible opacity-0",
      )}
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        style={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className="relative max-h-[68vh] overflow-hidden rounded-t-[28px] border border-paper/12 border-b-0 bg-ink/95 shadow-[0_-24px_80px_-32px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:mx-auto sm:mb-5 sm:max-w-3xl sm:rounded-[28px] sm:border-b"
        style={{ transform: "translateY(100%)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Queue"
      >
        <div role="status" className="sr-only">
          {moveNote}
        </div>

        <div className="flex items-center justify-between border-b border-paper/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="h-px w-5 bg-signal" />
            <h2 className="font-display text-sm font-bold tracking-tight text-paper">
              Queue
            </h2>
            <span className="mono-label rounded-full bg-paper/10 px-2 py-1 text-paper/45">
              {queue.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onClear && queue.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-paper/25 transition-colors hover:bg-signal/10 hover:text-signal cursor-pointer"
                aria-label="Clear queue"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-paper/40 transition-colors hover:bg-paper/10 hover:text-paper cursor-pointer"
              aria-label="Close queue"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="scrollbar-hide max-h-[calc(68vh-65px)] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
        >
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <Music className="h-8 w-8 text-paper/15" />
              <p className="mono-label text-paper/30">
                Your queue is empty. Search for songs to add.
              </p>
            </div>
          ) : (
            <ul ref={listRef} className="divide-y divide-paper/10">
              {queue.map((item, i) => {
                const isPlaying = i === currentIndex;
                return (
                  <li
                    key={item.queueItemId}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    className={cn(
                      "flex items-center gap-1 px-3 py-3 sm:px-5",
                      isPlaying
                        ? "bg-signal/[0.07]"
                        : "transition-colors hover:bg-paper/[0.04]",
                    )}
                  >
                    {canReorder && (
                      <button
                        type="button"
                        aria-label={`Reorder ${item.title}`}
                        onPointerDown={handleDragStart(i)}
                        onPointerMove={handleDragMove}
                        onPointerUp={handleDragEnd}
                        onPointerCancel={handleDragEnd}
                        onKeyDown={handleGripKeyDown(i)}
                        style={{ touchAction: "none" }}
                        className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-grab touch-none items-center justify-center rounded-full p-1.5 text-paper/20 transition-colors hover:text-paper/60 active:cursor-grabbing"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        onPlayItem(i);
                        // Move focus off the item so a follow-up Space/Enter
                        // does not natively re-activate this button and
                        // accidentally play/restart the same track.
                        e.currentTarget.blur();
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer text-left"
                      aria-label={`Play ${item.title}`}
                    >
                      <div className="relative shrink-0">
                        <AlbumArt
                          src={item.artwork}
                          title={item.title}
                          accent={accent}
                          size="sm"
                        />
                        {isPlaying && (
                          <div
                            className="absolute inset-0 flex items-center justify-center rounded-md bg-ink/70"
                          >
                            <div className="flex gap-0.5">
                              {[0, 1, 2].map((bar) => (
                                <span
                                  key={bar}
                                  className="w-0.5 rounded-full"
                                  style={{
                                    backgroundColor: accent,
                                    height: `${PLAYING_BAR_HEIGHTS[bar]}px`,
                                    animation: `pulse 0.8s ease-in-out ${bar * 0.15}s infinite alternate`,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm",
                            isPlaying
                              ? "font-display font-bold text-paper"
                              : "text-paper/75",
                          )}
                        >
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-paper/40">
                          {item.artist}
                        </p>
                      </div>
                    </button>

                    {item.duration ? (
                      <span className="shrink-0 pr-2 font-mono text-[10px] tabular-nums text-paper/30">
                        {formatTime(item.duration)}
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      disabled={isPlaying}
                      title={isPlaying ? "Currently playing" : undefined}
                      className="mr-1 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full p-2 text-paper/25 transition-colors hover:bg-signal/10 hover:text-signal cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-paper/25"
                      aria-label={`Remove ${item.title} from queue`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
