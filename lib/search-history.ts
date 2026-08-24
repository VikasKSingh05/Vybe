const STORAGE_KEY = "vybe.search.v1";
const MAX_ENTRIES = 8;
const MAX_LENGTH = 120;

export function loadSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .map((q) => q.slice(0, MAX_LENGTH))
      .slice(0, MAX_ENTRIES);
  } catch {
    // Corrupted payload — start with a clean slate
    return [];
  }
}

/** Moves the query to the front (case-insensitive dedupe), persists, returns the new list. */
export function saveSearchQuery(query: string): string[] {
  const trimmed = query.trim().slice(0, MAX_LENGTH);
  if (!trimmed) return loadSearchHistory();
  const previous = loadSearchHistory();
  const next = [
    trimmed,
    ...previous.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded / private mode — best effort
  }
  return next;
}

export function clearSearchHistory(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do
  }
}
