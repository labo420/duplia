import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Loader2, AlertCircle, ArrowLeft, Lightbulb, Search } from "lucide-react";
import { AiResultCard } from "@/components/match/AiResultCard";
import { BestGuessConfirmation } from "@/components/match/BestGuessConfirmation";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { SimilarProducts } from "@/components/search/SimilarProducts";
import { useAiSearch } from "@workspace/api-client-react";
import { useRecentSearches } from "@/hooks/use-recent-searches";
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

  // null = waiting for choice, true = confirmed, false = rejected
  const [bestGuessConfirmed, setBestGuessConfirmed] = useState<boolean | null>(null);

  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  const { mutate: runAiSearch, isPending: isAiSearching } = useAiSearch({
    mutation: {
      onSuccess: (data, variables) => {
        setAiResult(data);
        setAiError(null);
        setBestGuessConfirmed(null);
        addRecentSearch(variables.data.query);
      },
      onError: (err: unknown) => {
        const errMsg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Prodotto non trovato. Prova con un nome più specifico.";
        setAiError(errMsg);
        setAiResult(null);
        setBestGuessConfirmed(null);
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
    setBestGuessConfirmed(null);
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

  // Derived display flags
  const isBestGuess = aiResult?.isBestGuess === true;
  const showConfirmationPanel =
    aiResult && !isAiSearching && isBestGuess && bestGuessConfirmed === null;
  const showResultCard =
    aiResult && !isAiSearching && (!isBestGuess || bestGuessConfirmed === true);
  const showRejectionMessage =
    aiResult && !isAiSearching && isBestGuess && bestGuessConfirmed === false;

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
              recentSearches={recentSearches}
              onClearRecentSearches={clearRecentSearches}
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

        {/* Best-guess banner — shown when result is best-guess (regardless of confirmation state) */}
        {aiResult && isBestGuess && !isAiSearching && (
          <div
            className="flex items-start gap-3 p-4 rounded-2xl border"
            style={{
              background: "hsl(38 90% 95%)",
              borderColor: "hsl(38 80% 75%)",
            }}
            data-testid="banner-best-guess"
          >
            <Lightbulb
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: "hsl(38 80% 35%)" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "hsl(38 80% 25%)" }}>
                Non abbiamo trovato esattamente &ldquo;{q}&rdquo;, ma il nostro team ha
                selezionato un&apos;alternativa simile che potrebbe interessarti:
              </p>
              {aiResult.interpretedAs && (
                <p className="text-xs mt-1" style={{ color: "hsl(38 60% 35%)" }}>
                  Interpretato come: <em>{aiResult.interpretedAs}</em>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Confirmation panel — shown when best-guess and not yet chosen */}
        {showConfirmationPanel && (
          <section className="space-y-4" data-testid="section-confirmation">
            <h2 className="text-2xl font-serif font-bold tracking-tight">
              Una possibile alternativa per te
            </h2>
            <BestGuessConfirmation
              result={aiResult!}
              onConfirm={() => setBestGuessConfirmed(true)}
              onReject={() => setBestGuessConfirmed(false)}
            />
          </section>
        )}

        {/* Results — shown for exact matches or after best-guess confirmation */}
        {showResultCard && (
          <section className="space-y-4" data-testid="section-ai-result">
            <h2 className="text-2xl font-serif font-bold tracking-tight">
              {isBestGuess ? "Una possibile alternativa per te" : "Match verificati per te"}
            </h2>
            <AiResultCard result={aiResult!} query={q} />
          </section>
        )}

        {/* Rejection message — shown after the user says "no" */}
        {showRejectionMessage && (
          <section
            className="space-y-4 py-8 text-center"
            data-testid="section-rejection"
          >
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3"
              style={{ background: "hsl(38 90% 93%)" }}
            >
              <Search className="w-6 h-6" style={{ color: "hsl(38 80% 35%)" }} />
            </div>
            <h2 className="text-xl font-serif font-bold tracking-tight">
              Proviamo insieme
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Raffina la ricerca con il nome del brand o del prodotto specifico che hai
              in mente. Puoi anche esplorare i prodotti simili qui sotto.
            </p>
          </section>
        )}

        {/* Idle state (no result, no error, not loading) */}
        {!isAiSearching && !aiResult && !aiError && q && (
          <section className="py-12 text-center text-muted-foreground">
            <p className="text-sm">Avvio ricerca per &ldquo;{q}&rdquo;…</p>
          </section>
        )}

        {/* Always show similar products from catalog */}
        {!isAiSearching && q && <SimilarProducts query={q} />}

      </div>
    </div>
  );
}
