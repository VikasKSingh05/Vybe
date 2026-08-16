"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, Loader2, ChevronDown } from "lucide-react";
import type { Song } from "@/types/music";
import { AlbumArt } from "@/components/AlbumArt";
import { cn } from "@/lib/cn";

interface PartyAddSongProps {
  accent: string;
  onAdd: (song: Song) => void;
}

const DEBOUNCE_MS = 450;

export function PartyAddSong({ accent, onAdd }: PartyAddSongProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    setError(null);
    const seq = ++requestSeqRef.current;
    try {
      const res = await fetch(`/api/music/search?query=${encodeURIComponent(trimmed)}`);
      const data = (await res.json().catch(() => null)) as
        | { songs?: Song[]; error?: string }
        | null;
      if (seq !== requestSeqRef.current) return;
      if (!res.ok || !data) {
        setError(data?.error ?? "Search failed");
        setResults([]);
      } else {
        setResults(data.songs ?? []);
      }
      setSearched(true);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setError("Search failed");
      setResults([]);
      setSearched(true);
    } finally {
      if (seq === requestSeqRef.current) setSearching(false);
    }
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void runSearch(value);
      }, DEBOUNCE_MS);
    },
    [runSearch],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleAdd = useCallback(
    (song: Song) => {
      onAdd(song);
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.add(song.id);
        return next;
      });
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(song.id);
          return next;
        });
      }, 2000);
    },
    [onAdd],
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] sm:px-5 cursor-pointer"
      >
        <span className="flex items-center gap-2 text-[10px] tracking-widest text-white/40 uppercase">
          <Search className="h-3.5 w-3.5" style={{ color: accent }} />
          Add a track
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-white/30 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="px-4 py-4 sm:px-5">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search JioSaavn…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/30"
          />

        {searching && (
          <div className="flex items-center gap-2 px-1 pt-4 text-xs text-white/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching…
          </div>
        )}

        {error && (
          <p className="px-1 pt-4 text-xs text-red-300">{error}</p>
        )}

        {!searching && searched && results.length === 0 && !error && (
          <p className="px-1 pt-4 text-xs text-white/35">
            No results for “{query.trim()}”.
          </p>
        )}

        {!searching && results.length > 0 && (
          <ul className="mt-3 max-h-64 divide-y divide-white/5 overflow-y-auto scrollbar-hide">
            {results.map((song) => {
              const added = addedIds.has(song.id);
              return (
                <li
                  key={song.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <AlbumArt
                    src={song.artwork}
                    title={song.title}
                    accent={accent}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/85">{song.title}</p>
                    <p className="truncate text-xs text-white/40">{song.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(song)}
                    disabled={added}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 cursor-pointer",
                      added
                        ? "bg-white/10 text-white/60"
                        : "text-black hover:brightness-110",
                    )}
                    style={!added ? { backgroundColor: accent } : undefined}
                  >
                    <Plus className="h-3 w-3" />
                    {added ? "Added" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      )}
    </div>
  );
}
