import { useState, useRef } from "react";
import { Search, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchCard } from "@/components/match/MatchCard";
import { AiResultCard } from "@/components/match/AiResultCard";
import {
  useListMatches,
  useGetCategorySummary,
  useGetTrending,
  useAiSearch,
} from "@workspace/api-client-react";
import type { AiSearchResult } from "@workspace/api-client-react/src/generated/api.schemas";

type Category = "Skincare" | "Makeup" | "Haircare" | "Bodycare" | "Fragrance" | undefined;

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>(undefined);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState<AiSearchResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const lastAiQueryRef = useRef<string>("");

  const { data: categorySummary } = useGetCategorySummary();
  const { data: trendingMatches, isLoading: isLoadingTrending } = useGetTrending();
  const { data: matches, isLoading: isLoadingMatches } = useListMatches({
    search: search || undefined,
    category: selectedCategory as string | undefined,
  });

  const { mutate: runAiSearch, isPending: isAiSearching } = useAiSearch({
    mutation: {
      onSuccess: (data) => {
        setAiResult(data);
        setAiError(null);
      },
      onError: (err: unknown) => {
        const errMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Prodotto non trovato. Prova con un nome più specifico.";
        setAiError(errMsg);
        setAiResult(null);
      },
    },
  });

  const isFiltering = !!search || !!selectedCategory;

  function handleAiSearch() {
    const q = search.trim();
    if (!q || q === lastAiQueryRef.current) return;
    lastAiQueryRef.current = q;
    setAiQuery(q);
    setAiResult(null);
    setAiError(null);
    runAiSearch({ data: { query: q } });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleAiSearch();
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    if (!e.target.value.trim()) {
      setAiResult(null);
      setAiError(null);
      setAiQuery("");
      lastAiQueryRef.current = "";
    }
  }

  return (
    <div className="flex-1 w-full pb-24">
      {/* Hero */}
      <section className="py-20 md:py-32 px-4 text-center border-b border-border/40">
        <div className="container mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight leading-tight">
            L'alternativa perfetta<br />al lusso che ami.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
            Scopri le migliori alternative economiche ai prodotti beauty iconici, curate per il mercato europeo.
          </p>

          <div className="max-w-xl mx-auto mt-10 space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Cerca un prodotto, un brand o un dupe..."
                className="pl-12 pr-36 h-14 text-base rounded-full shadow-sm bg-background border-border/40 focus-visible:ring-1"
                value={search}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                data-testid="input-search"
              />
              <button
                onClick={handleAiSearch}
                disabled={!search.trim() || isAiSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, hsl(345 55% 32%), hsl(345 55% 26%))" }}
                data-testid="button-ai-search"
              >
                {isAiSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isAiSearching ? "Analisi..." : "AI"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/70 text-center">
              Premi <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> o clicca <strong>AI</strong> per trovare i dupe con intelligenza artificiale
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 mt-12 space-y-16">

        {/* Category filters */}
        <section className="flex flex-wrap justify-center gap-3" data-testid="section-categories">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
              !selectedCategory
                ? "bg-foreground text-background shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
            data-testid="filter-all"
          >
            Tutti i prodotti
          </button>
          {categorySummary?.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category as Category)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === cat.category
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
              data-testid={`filter-${cat.category}`}
            >
              {cat.category}{" "}
              <span className="ml-1 opacity-50">({cat.count})</span>
            </button>
          ))}
        </section>

        {/* AI Search Result */}
        {isAiSearching && (
          <section className="space-y-4" data-testid="section-ai-loading">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(345 55% 32%)" }} />
              <h2 className="text-xl font-serif font-bold tracking-tight">
                L'AI sta analizzando &ldquo;{search}&rdquo;...
              </h2>
            </div>
            <div className="rounded-3xl border border-border/40 p-8 bg-muted/20 animate-pulse" />
          </section>
        )}

        {aiError && !isAiSearching && (
          <section className="space-y-4" data-testid="section-ai-error">
            <div className="flex items-center gap-3 p-5 rounded-2xl bg-destructive/5 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{aiError}</p>
            </div>
          </section>
        )}

        {aiResult && !isAiSearching && (
          <section className="space-y-4" data-testid="section-ai-result">
            <h2 className="text-2xl font-serif font-bold tracking-tight">
              Dupe trovati con AI
            </h2>
            <AiResultCard result={aiResult} query={aiQuery} />
          </section>
        )}

        {/* Trend del Momento */}
        {!isFiltering && !aiResult && !isAiSearching && (
          <section className="space-y-6">
            <h2 className="text-2xl font-serif font-bold tracking-tight">Trend del Momento</h2>
            {isLoadingTrending ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[440px] rounded-3xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(trendingMatches) && trendingMatches.map((match) => (
                  <MatchCard key={match.matchId} match={match} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Main matches feed */}
        <section className="space-y-6">
          <h2 className="text-2xl font-serif font-bold tracking-tight">
            {search
              ? "Risultati nella libreria"
              : selectedCategory
              ? `Tutto in ${selectedCategory}`
              : "Scopri i Dupe"}
          </h2>

          {isLoadingMatches ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-[440px] rounded-3xl" />
              ))}
            </div>
          ) : matches?.length === 0 && !search ? (
            <div className="py-24 text-center text-muted-foreground rounded-3xl border border-dashed border-border">
              Nessun risultato trovato.
            </div>
          ) : matches?.length === 0 && search ? (
            <div className="py-16 text-center space-y-4 rounded-3xl border border-dashed border-border">
              <p className="text-muted-foreground">Nessun risultato nella libreria per &ldquo;{search}&rdquo;.</p>
              <p className="text-sm text-muted-foreground/70">
                Premi <strong>AI</strong> in alto oppure <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> per cercarlo con l'intelligenza artificiale.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches?.map((match) => (
                <MatchCard key={match.matchId} match={match} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
