"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, Loader2, X, Play, Music } from "lucide-react";
import type { Song } from "@/types/music";
import { AlbumArt } from "@/components/AlbumArt";
import { cn } from "@/lib/cn";

interface SearchBarProps {
  query: string;
  results: Song[];
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
  accent: string;
  onQueryChange: (value: string) => void;
  onPlaySong: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  className?: string;
}

export function SearchBar({
  query,
  results,
  isSearching,
  hasSearched,
  error,
  accent,
  onQueryChange,
  onPlaySong,
  onAddToQueue,
  className,
}: SearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        inputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasDropdown =
    (isSearching || error || hasSearched || results.length > 0) && query.trim();

  useEffect(() => {
    if (!hasDropdown || !containerRef.current) {
      setDropdownPosition(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, [hasDropdown, query]);

  const handleClear = useCallback(() => {
    onQueryChange("");
    inputRef.current?.focus();
  }, [onQueryChange]);

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-xl", className)}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => {}}
          placeholder="Search songs, artists… ( / )"
          aria-label="Search for songs, artists, albums"
          className="w-full rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl py-3 pl-10 pr-10 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/25 focus:ring-1 focus:ring-white/10"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/30 hover:text-white/60 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {hasDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 max-h-[40vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl scrollbar-hide z-[100]"
          style={{ visibility: dropdownPosition ? "visible" : "hidden" }}
        >
          {error && (
            <p className="px-4 py-3 text-xs text-red-300">{error}</p>
          )}

          {!isSearching && hasSearched && results.length === 0 && !error && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Music className="h-6 w-6 text-white/15" />
              <p className="text-xs text-white/30">
                No results for &ldquo;{query.trim()}&rdquo;.
              </p>
            </div>
          )}

          {isSearching && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-5 text-xs text-white/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching...
            </div>
          )}

          {results.length > 0 && (
            <ul className="divide-y divide-white/5">
              {results.map((song) => (
                <li
                  key={song.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <AlbumArt
                    src={song.artwork}
                    title={song.title}
                    accent={accent}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {song.title}
                    </p>
                    <p className="truncate text-xs text-white/50">
                      {song.artist}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onPlaySong(song)}
                      className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/70 transition-all hover:text-white hover:bg-white/10 cursor-pointer"
                      aria-label={`Play ${song.title}`}
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddToQueue(song)}
                      className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium text-black transition-all hover:brightness-110 cursor-pointer"
                      style={{ backgroundColor: accent }}
                      aria-label={`Add ${song.title} to queue`}
                    >
                      <Plus className="h-3 w-3" />
                      Queue
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
