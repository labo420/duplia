import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { AiResultCard } from "@/components/match/AiResultCard";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { useAiSearch } from "@workspace/api-client-react";
import type { AiSearchResult } from "@workspace/api-client-react";

const LOADING_MESSAGES = [
  "Scansione INCI in corso…",
  "Analisi ingredienti attivi…",
  "Recupero i match dal nostro archivio…",
  "Verifica del team in corso…",
  "Quasi pronti…",
];

export default function SearchResults() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const q = new URLSearchParams(searchString).get("q")?.trim() ?? "";

  const [searchInput, setSearchInput] = useState(q);
  const [aiResult, setAiResult] = useState<AiSearchResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const lastFiredQueryRef = useRef<string>("");

  const { mutate: runAiSearch, isPending: isAiSearching } = useAiSearch({
    mutation: {
      onSuccess: (data) => {
        setAiResult(data);
        setAiError(null);
      },
      onError: (err: unknown) => {
        const errMsg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Prodotto non trovato. Prova con un nome più specifico.";
        setAiError(errMsg);
        setAiResult(null);
      },
    },
  });

  // Dynamic page title
  useEffect(() => {
    if (q) {
      document.title = `${q} — match verificati | Duplia`;
    } else {
      document.title = "Duplia";
    }
    return () => {
      document.title = "Duplia";
    };
  }, [q]);

  // Redirect if no query
  useEffect(() => {
    if (!q) {
      navigate("/");
    }
  }, [q, navigate]);

  // Auto-fire search whenever q changes
  useEffect(() => {
    if (!q || q === lastFiredQueryRef.current) return;
    lastFiredQueryRef.current = q;
    setSearchInput(q);
    setAiResult(null);
    setAiError(null);
    setLoadingMsgIdx(0);
    runAiSearch({ data: { query: q } });
  }, [q, runAiSearch]);

  // Cycle loading messages while searching
  useEffect(() => {
    if (!isAiSearching) {
      setLoadingMsgIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isAiSearching]);

  function handleNewSearch(newQ?: string) {
    const query = (newQ ?? searchInput).trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="flex-1 w-full pb-24">
      {/* Search header */}
      <div
        className="sticky top-0 z-20 border-b border-border/40 px-4 py-4"
        style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(12px)" }}
      >
        <div className="container mx-auto max-w-3xl flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="shrink-0 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Torna alla home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Torna alla home</span>
          </button>
          <div className="flex-1">
            <SearchAutocomplete
              value={searchInput}
              onChange={setSearchInput}
              onSearch={handleNewSearch}
              isSearching={isAiSearching}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 mt-10 space-y-8">

        {/* Loading */}
        {isAiSearching && (
          <section className="space-y-4" data-testid="section-ai-loading">
            <div className="flex items-center gap-3">
              <Loader2
                className="w-5 h-5 animate-spin shrink-0"
                style={{ color: "hsl(345 55% 32%)" }}
              />
              <h2 className="text-xl font-serif font-bold tracking-tight">
                {LOADING_MESSAGES[loadingMsgIdx]}
              </h2>
            </div>
            <div className="rounded-3xl border border-border/40 p-8 bg-muted/20 animate-pulse h-64" />
          </section>
        )}

        {/* Error */}
        {aiError && !isAiSearching && (
          <section className="space-y-4" data-testid="section-ai-error">
            <div className="flex items-center gap-3 p-5 rounded-2xl bg-destructive/5 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{aiError}</p>
            </div>
          </section>
        )}

        {/* Results */}
        {aiResult && !isAiSearching && (
          <section className="space-y-4" data-testid="section-ai-result">
            <h2 className="text-2xl font-serif font-bold tracking-tight">
              Match verificati per te
            </h2>
            <AiResultCard result={aiResult} query={q} />
          </section>
        )}

        {/* Idle state (no result, no error, not loading) */}
        {!isAiSearching && !aiResult && !aiError && q && (
          <section className="py-12 text-center text-muted-foreground">
            <p className="text-sm">Avvio ricerca per &ldquo;{q}&rdquo;…</p>
          </section>
        )}

      </div>
    </div>
  );
}
