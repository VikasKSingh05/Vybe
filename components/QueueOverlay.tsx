"use client";

import { useEffect, useRef } from "react";
import { X, Music, Trash2 } from "lucide-react";
import gsap from "gsap";
import type { QueueItem } from "@/data/types";
import { AlbumArt } from "@/components/AlbumArt";
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
}

export function QueueOverlay({
  queue,
  currentIndex,
  accent,
  isOpen,
  onClose,
  onRemove,
  onPlayItem,
  onClear,
}: QueueOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!panelRef.current || !backdropRef.current) return;

    if (!hasMounted.current) {
      hasMounted.current = true;
      if (!isOpen) {
        gsap.set(panelRef.current, { y: "100%" });
        gsap.set(backdropRef.current, { opacity: 0 });
      }
      return;
    }

    const ctx = gsap.context(() => {
      if (isOpen) {
        gsap.fromTo(
          backdropRef.current!,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, ease: "power2.out" },
        );
        gsap.fromTo(
          panelRef.current!,
          { y: "100%" },
          { y: "0%", duration: 0.4, ease: "power3.out" },
        );
      } else {
        gsap.to(panelRef.current!, {
          y: "100%",
          duration: 0.3,
          ease: "power2.in",
        });
        gsap.to(backdropRef.current!, {
          opacity: 0,
          duration: 0.25,
          ease: "power2.in",
        });
      }
    });
    return () => ctx.revert();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col justify-end",
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
        className="relative max-h-[60vh] rounded-t-2xl border-t border-white/10 bg-[#0d0d0d]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        style={{ transform: "translateY(100%)" }}
        role="dialog"
        aria-label="Queue"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-wide text-white/90">
              Queue
            </h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/40">
              {queue.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onClear && queue.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-full p-2 text-white/25 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Clear queue"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close queue"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(60vh-60px)] pb-[env(safe-area-inset-bottom)] scrollbar-hide">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <Music className="h-8 w-8 text-white/15" />
              <p className="text-xs text-white/30">
                Your queue is empty. Search for songs to add.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {queue.map((item, i) => {
                const isPlaying = i === currentIndex;
                return (
                  <li
                    key={item.queueItemId}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 transition-colors",
                      isPlaying
                        ? "bg-white/[0.06]"
                        : "hover:bg-white/[0.03]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onPlayItem(i)}
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
                            className="absolute inset-0 rounded-md flex items-center justify-center bg-black/50"
                          >
                            <div className="flex gap-0.5">
                              {[0, 1, 2].map((bar) => (
                                <span
                                  key={bar}
                                  className="w-0.5 rounded-full bg-white"
                                  style={{
                                    height: `${6 + Math.random() * 6}px`,
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
                              ? "font-medium text-white"
                              : "text-white/75",
                          )}
                        >
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-white/35">
                          {item.artist}
                        </p>
                      </div>
                    </button>

                    {item.duration ? (
                      <span className="shrink-0 text-[10px] font-mono text-white/25 tabular-nums">
                        {formatTime(item.duration)}
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      className="shrink-0 rounded-full p-2 text-white/25 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
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
