import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2, Sparkles, Clock } from "lucide-react";
import { useGetAiSuggestions } from "@workspace/api-client-react";
import type { AiSuggestion } from "@workspace/api-client-react";

const CATEGORY_COLORS: Record<string, string> = {
  Makeup: "bg-rose-100 text-rose-700",
  Skincare: "bg-emerald-100 text-emerald-700",
  Fragrance: "bg-purple-100 text-purple-700",
  Haircare: "bg-amber-100 text-amber-700",
  Bodycare: "bg-sky-100 text-sky-700",
};

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  isSearching,
}: SearchAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        setDebouncedQuery(value.trim());
      }, 300);
    } else {
      setDebouncedQuery("");
      setOpen(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const { data: suggestions = [], isFetching } = useGetAiSuggestions(
    { q: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.length >= 2,
        staleTime: 30_000,
      },
    }
  );

  useEffect(() => {
    if (suggestions.length > 0 && debouncedQuery.length >= 2) {
      setOpen(true);
      setActiveIndex(-1);
    } else {
      setOpen(false);
    }
  }, [suggestions, debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSuggestion = useCallback(
    (suggestion: AiSuggestion) => {
      const fullName = `${suggestion.brand} ${suggestion.name}`;
      onChange(fullName);
      setOpen(false);
      setActiveIndex(-1);
      onSearch(fullName);
    },
    [onChange, onSearch]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") onSearch(value.trim());
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectSuggestion(suggestions[activeIndex]);
      } else {
        setOpen(false);
        onSearch(value.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Cerca un prodotto luxury (es. Charlotte Tilbury, La Mer…)"
          className="w-full pl-12 pr-36 h-14 text-base rounded-full shadow-sm bg-background border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring focus-visible:ring-1 transition-shadow"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!e.target.value.trim()) setOpen(false);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && value.trim().length >= 2) setOpen(true);
          }}
          autoComplete="off"
          data-testid="input-search"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onSearch(value.trim());
          }}
          disabled={!value.trim() || isSearching}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, hsl(345 55% 32%), hsl(345 55% 26%))" }}
          data-testid="button-ai-search"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isSearching ? "Analisi..." : "AI"}
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-background border border-border/50 rounded-2xl shadow-xl overflow-hidden"
        >
          {isFetching && (
            <li className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Aggiornamento…
            </li>
          )}
          {suggestions.map((s, i) => {
            const catColor = CATEGORY_COLORS[s.category] ?? "bg-muted text-muted-foreground";
            const isActive = i === activeIndex;
            return (
              <li
                key={`${s.brand}-${s.name}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  isActive ? "bg-muted" : "hover:bg-muted/60"
                } ${i > 0 ? "border-t border-border/30" : ""}`}
                data-testid={`suggestion-${i}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground font-medium">{s.brand}</span>
                  <p className="text-sm font-semibold truncate leading-tight">{s.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.isFromCache && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70 font-medium">
                      <Clock className="w-3 h-3" />
                      Già cercato
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColor}`}>
                    {s.category}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
