"use client";

import { useEffect, useRef } from "react";
import { Search, X, Music, Loader2 } from "lucide-react";
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
  onQueryChange: (query: string) => void;
  onPlaySong: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
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
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        inputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = hasSearched || isSearching;

  useEffect(() => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    const rect = el.getBoundingClientRect();
    const dropdownEl = el.parentElement?.querySelector("[data-search-dropdown]");
    if (dropdownEl) {
      (dropdownEl as HTMLElement).style.top = `${rect.bottom + 4}px`;
      (dropdownEl as HTMLElement).style.left = `${rect.left}px`;
      (dropdownEl as HTMLElement).style.width = `${rect.width}px`;
    }
  }, [showDropdown]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search songs..."
          className="w-full rounded-full border border-white/10 bg-black/30 py-2.5 pl-9 pr-9 text-xs text-white/90 placeholder-white/30 outline-none backdrop-blur-md transition-colors focus:border-white/20 focus:bg-black/40"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          data-search-dropdown
          className="fixed z-[100] mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d0d]/95 shadow-2xl backdrop-blur-xl scrollbar-hide"
        >
          {isSearching && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-6">
              <Loader2 className="h-4 w-4 animate-spin text-white/30" />
              <span className="text-xs text-white/30">Searching...</span>
            </div>
          )}

          {!isSearching && error && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-red-400/70">{error}</p>
            </div>
          )}

          {!isSearching && !error && results.length === 0 && hasSearched && (
            <div className="flex flex-col items-center gap-2 px-4 py-6">
              <Music className="h-6 w-6 text-white/15" />
              <p className="text-xs text-white/30">No results found</p>
            </div>
          )}

          {results.length > 0 && (
            <ul className="divide-y divide-white/5">
              {results.map((song) => (
                <li
                  key={song.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.03] transition-colors"
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
                    <p className="truncate text-xs font-medium text-white/80">
                      {song.title}
                    </p>
                    <p className="truncate text-[10px] text-white/35">
                      {song.artist}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onPlaySong(song)}
                      className="rounded-full px-2.5 py-1 text-[10px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddToQueue(song)}
                      className="rounded-full px-2.5 py-1 text-[10px] font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"
                    >
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
