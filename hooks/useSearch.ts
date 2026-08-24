"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "@/types/music";
import {
  loadSearchHistory,
  saveSearchQuery,
  clearSearchHistory,
} from "@/lib/search-history";

const DEBOUNCE_MS = 450;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(() => loadSearchHistory());

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    setError(null);
    const seq = ++requestSeqRef.current;
    try {
      const res = await fetch(
        `/api/music/search?query=${encodeURIComponent(trimmed)}`,
      );
      const data = (await res.json().catch(() => null)) as
        | { songs?: Song[]; error?: string }
        | null;
      if (seq !== requestSeqRef.current) return;
      if (!res.ok || !data) {
        setError(data?.error ?? "Search failed");
        setResults([]);
      } else {
        setResults(data.songs ?? []);
        setHistory(saveSearchQuery(trimmed));
      }
      setHasSearched(true);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setError("Search failed");
      setResults([]);
      setHasSearched(true);
    } finally {
      if (seq === requestSeqRef.current) setIsSearching(false);
    }
  }, []);

  const updateQuery = useCallback(
    (value: string) => {
      setQuery(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void runSearch(value);
      }, DEBOUNCE_MS);
    },
    [runSearch],
  );

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      void runSearch(q);
    },
    [runSearch],
  );

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setError(null);
    setIsSearching(false);
  }, []);

  const clearHistory = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
  }, []);

  return {
    query,
    setQuery: updateQuery,
    results,
    isSearching,
    hasSearched,
    error,
    search,
    clear,
    history,
    clearHistory,
  };
}
