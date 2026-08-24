"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Music, Loader2, Eraser, Play, ListStart, ListPlus, Clock } from "lucide-react";
import gsap from "gsap";
import type { Song } from "@/types/music";
import { AlbumArt } from "@/components/AlbumArt";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/cn";

interface SearchOverlayProps {
  query: string;
  results: Song[];
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
  accent: string;
  history?: string[];
  onQueryChange: (query: string) => void;
  onPlaySong: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  onSearchSubmit?: (query: string) => void;
  onClearHistory?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function SearchOverlay({
  query,
  results,
  isSearching,
  hasSearched,
  error,
  accent,
  history,
  onQueryChange,
  onPlaySong,
  onAddToQueue,
  onPlayNext,
  onSearchSubmit,
  onClearHistory,
  onOpenChange,
}: SearchOverlayProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startRectRef = useRef<DOMRect | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const isAnimating = useRef(false);
  const hasMounted = useRef(false);

  // The overlay restores focus to the trigger itself after its close
  // animation, so the trap must not double-restore.
  useFocusTrap({
    containerRef: panelRef,
    active: isOpen,
    restoreFocus: false,
  });

  // Suppress initial hydration — set panel to hidden on mount
  useEffect(() => {
    if (!panelRef.current || !backdropRef.current) return;
    if (!hasMounted.current) {
      hasMounted.current = true;
      gsap.set(panelRef.current, { opacity: 0, scale: 0.95, pointerEvents: "none" });
      gsap.set(backdropRef.current, { opacity: 0, pointerEvents: "none" });
    }
  }, []);
  const handleOpen = useCallback(() => {
    if (isAnimating.current || isOpen) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!trigger || !panel || !backdrop) return;

    const rect = trigger.getBoundingClientRect();
    startRectRef.current = rect;
    isAnimating.current = true;

    // Position panel at trigger location
    gsap.set(panel, {
      position: "fixed",
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      borderRadius: "9999px",
      opacity: 1,
      scale: 1,
      zIndex: 60,
      pointerEvents: "auto",
    });
    gsap.set(backdrop, { opacity: 0, pointerEvents: "auto" });
    // Restore content in case a previous close was interrupted
    if (contentRef.current) gsap.set(contentRef.current, { opacity: 1 });

    // Compact screens: lift the resting position above center so the input
    // stays visible when the on-screen keyboard opens
    const compact = window.matchMedia("(max-width: 640px)").matches;

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
        inputRef.current?.focus();
      },
    });

    tl.to(backdrop, { opacity: 1, duration: 0.3, ease: "power2.out" }, 0);
    tl.to(
      panel,
      {
        top: compact ? "46%" : "50%",
        left: "50%",
        xPercent: -50,
        yPercent: -50,
        width: compact ? "min(92vw, 640px)" : "min(90vw, 640px)",
        height: compact ? "min(72dvh, 520px)" : "min(80vh, 520px)",
        borderRadius: "1rem",
        duration: 0.45,
        ease: "power3.out",
      },
      0,
    );

    setIsOpen(true);
    onOpenChange?.(true);
  }, [isOpen, onOpenChange]);

  const handleClose = useCallback(() => {
    if (isAnimating.current || !isOpen) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    // Clear query before collapse so input empties smoothly
    onQueryChange("");

    // Release focus so keystrokes ("/" or text) can't land in the hidden input
    inputRef.current?.blur();

    // Use stored or fresh trigger rect
    const rect = trigger?.getBoundingClientRect() ?? startRectRef.current;
    isAnimating.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
        setIsOpen(false);
        onOpenChange?.(false);
        // Full reset so panel never lingers over the trigger
        gsap.set(panel, {
          opacity: 0,
          scale: 0.95,
          xPercent: 0,
          yPercent: 0,
          pointerEvents: "none",
        });
        gsap.set(backdrop, { pointerEvents: "none" });
        // Return focus to the invoking control (standard dialog a11y)
        triggerRef.current?.focus();
      },
    });

    // Content dissolves instantly — no clipped-text mush during shrink
    if (contentRef.current) {
      tl.to(contentRef.current, { opacity: 0, duration: 0.18, ease: "power2.in" }, 0);
    }

    // Shell stays fully opaque while flying home — S-curve, gentle lift-off/landing
    tl.to(
      panel,
      rect
        ? {
            top: rect.top,
            left: rect.left,
            xPercent: 0,
            yPercent: 0,
            width: rect.width,
            height: rect.height,
            borderRadius: "9999px",
            duration: 0.5,
            ease: "power2.inOut",
          }
        : { opacity: 0, scale: 0.95, duration: 0.3, ease: "power2.inOut" },
      0,
    );

    // Blur lifts in sync with the shrink, landing together (~0.5s)
    tl.to(backdrop, { opacity: 0, duration: 0.45, ease: "power2.inOut" }, 0.05);

    // Final 12% only — invisible handoff from dark glass pill to trigger pill
    tl.to(panel, { opacity: 0, duration: 0.12, ease: "power1.in" }, 0.38);
  }, [isOpen, onOpenChange, onQueryChange]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  // "/" shortcut to open (only when random mode / not already open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !isOpen &&
        document.activeElement !== inputRef.current &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        handleOpen();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleOpen]);

  const handleQueryChange = useCallback(
    (value: string) => {
      onQueryChange(value);
    },
    [onQueryChange],
  );

  const handlePlay = useCallback(
    (song: Song) => {
      onPlaySong(song);
      handleClose();
    },
    [onPlaySong, handleClose],
  );

  const handleQueue = useCallback(
    (song: Song) => {
      onAddToQueue(song);
      handleClose();
    },
    [onAddToQueue, handleClose],
  );

  const handlePlayNext = useCallback(
    (song: Song) => {
      onPlayNext?.(song);
      handleClose();
    },
    [onPlayNext, handleClose],
  );

  const handleHistorySearch = useCallback(
    (q: string) => {
      onSearchSubmit?.(q);
    },
    [onSearchSubmit],
  );

  const handleClearQuery = useCallback(() => {
    onQueryChange("");
    inputRef.current?.focus();
  }, [onQueryChange]);

  return (
    <>
      {/* ─── TRIGGER BUTTON ─── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="flex min-h-[44px] w-full max-w-xl items-center justify-center gap-2.5 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-center text-xs text-white/40 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-black/40 hover:text-white/60 cursor-pointer"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span>Search for songs...</span>
      </button>

      {/* ─── OVERLAY ─── */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[59] bg-black/80 backdrop-blur-sm"
        style={{ opacity: 0, pointerEvents: "none" }}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className="fixed z-[60] flex flex-col overflow-hidden border border-white/10 bg-[#0d0d0d]/95 shadow-2xl backdrop-blur-xl"
        style={{
          opacity: 0,
          pointerEvents: "none",
          borderRadius: "9999px",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Search songs"
      >
        <div ref={contentRef} className="flex min-h-0 flex-1 flex-col">
          {/* ─── INPUT BAR ─── */}
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-white/30" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search songs..."
              className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/30 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={handleClearQuery}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="ml-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ─── RESULTS ─── */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isSearching && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-12">
              <Loader2 className="h-4 w-4 animate-spin text-white/30" />
              <span className="text-xs text-white/30">Searching...</span>
            </div>
          )}

          {!isSearching && error && (
            <div className="px-4 py-12 text-center">
              <p className="text-xs text-red-400/70">{error}</p>
            </div>
          )}

          {!isSearching && !error && results.length === 0 && hasSearched && (
            <div className="flex flex-col items-center gap-2 px-4 py-12">
              <Music className="h-8 w-8 text-white/15" />
              <p className="text-xs text-white/30">No results found</p>
            </div>
          )}

          {!hasSearched && !isSearching && history && history.length > 0 && (
            <div className="px-2 py-3">
              <div className="flex items-center justify-between px-2 pb-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/30">
                  Recent
                </span>
                {onClearHistory && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="rounded-full px-2.5 py-1.5 text-[11px] text-white/30 transition-colors hover:text-white/70 hover:bg-white/5 cursor-pointer min-h-[32px]"
                  >
                    Clear
                  </button>
                )}
              </div>
              <ul className="divide-y divide-white/5">
                {history.map((h) => (
                  <li key={h}>
                    <button
                      type="button"
                      onClick={() => handleHistorySearch(h)}
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04] cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-white/25" />
                      <span className="min-w-0 flex-1 truncate text-sm text-white/70">
                        {h}
                      </span>
                      <Search className="h-3 w-3 shrink-0 text-white/20" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasSearched && !isSearching && (!history || history.length === 0) && (
            <div className="flex flex-col items-center gap-2 px-4 py-12">
              <Search className="h-8 w-8 text-white/10" />
              <p className="text-xs text-white/25">
                Type to search millions of songs
              </p>
            </div>
          )}

          {results.length > 0 && (
            <ul className="divide-y divide-white/5">
              {results.map((song) => (
                <li
                  key={song.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="shrink-0">
                    <AlbumArt
                      src={song.artwork}
                      title={song.title}
                      accent={accent}
                      size="sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/80">
                      {song.title}
                    </p>
                    <p className="truncate text-[11px] text-white/35">
                      {song.artist}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handlePlay(song)}
                      aria-label={`Play ${song.title}`}
                      title="Play"
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    {onPlayNext && (
                      <button
                        type="button"
                        onClick={() => handlePlayNext(song)}
                        aria-label={`Play ${song.title} next`}
                        title="Play next"
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full p-2 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <ListStart className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleQueue(song)}
                      aria-label={`Add ${song.title} to queue`}
                      title="Add to queue"
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full p-2 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <ListPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>
      </div>
    </>
  );
}
