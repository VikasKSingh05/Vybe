"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import type { Song } from "@/types/music";
import { AlbumArt } from "@/components/AlbumArt";
import { cn } from "@/lib/cn";

interface PartyAddSongProps {
  accent: string;
  onAdd: (song: Song) => void;
}

const DEBOUNCE_MS = 450;

export function PartyAddSong({ accent, onAdd }: PartyAddSongProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) void runSearch(query);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <p className="text-[10px] tracking-widest text-white/40 uppercase">
          Add a track to the queue
        </p>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
              style={{ color: undefined }}
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search JioSaavn for songs, artists, albums..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/25"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium text-black transition-all duration-200 hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: accent }}
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-xs text-red-300">{error}</p>
        )}

        {!searching && searched && results.length === 0 && !error && (
          <p className="mt-3 text-xs text-white/30">
            No results for &ldquo;{query.trim()}&rdquo;.
          </p>
        )}

        {results.length > 0 && (
          <ul className="mt-3 max-h-[25vh] divide-y divide-white/5 overflow-y-auto scrollbar-hide">
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
    </div>
  );
}
