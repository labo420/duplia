import { useState, useCallback } from "react";

const STORAGE_KEY = "dupefy_recent_searches";
const MAX_RECENT = 5;

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string");
    return [];
  } catch {
    return [];
  }
}

function saveToStorage(searches: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
  }
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadFromStorage());

  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const deduped = [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())];
      const next = deduped.slice(0, MAX_RECENT);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    saveToStorage([]);
    setRecentSearches([]);
  }, []);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}
