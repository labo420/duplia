import { useState, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { AiResultCard } from "@/components/match/AiResultCard";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { StatsStrip } from "@/components/home/StatsStrip";
import { CategoryCards } from "@/components/home/CategoryCards";
import { LuxuryCatalogGrid } from "@/components/home/LuxuryCatalogGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { useAiSearch } from "@workspace/api-client-react";
import type { AiSearchResult } from "@workspace/api-client-react";

type Category = "Skincare" | "Makeup" | "Haircare" | "Bodycare" | "Fragrance" | undefined;

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>(undefined);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState<AiSearchResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const lastAiQueryRef = useRef<string>("");

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

  function handleAiSearch(q?: string) {
    const query = (q ?? search).trim();
    if (!query || query === lastAiQueryRef.current) return;
    lastAiQueryRef.current = query;
    setAiQuery(query);
    setAiResult(null);
    setAiError(null);
    runAiSearch({ data: { query } });

    // Scroll to results
    setTimeout(() => {
      document.getElementById("ai-results-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (!value.trim()) {
      setAiResult(null);
      setAiError(null);
      setAiQuery("");
      lastAiQueryRef.current = "";
    }
  }

  function handleCatalogSelect(query: string) {
    setSearch(query);
    handleAiSearch(query);
  }

  return (
    <div className="flex-1 w-full pb-24">
      {/* Hero */}
      <section className="py-20 md:py-28 px-4 text-center">
        <div className="container mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight leading-tight">
            L'alternativa perfetta<br />al lusso che ami.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
            Scopri le migliori alternative economiche ai prodotti beauty iconici, curate per il mercato europeo.
          </p>

          <div className="max-w-xl mx-auto mt-10 space-y-3">
            <SearchAutocomplete
              value={search}
              onChange={handleSearchChange}
              onSearch={handleAiSearch}
              isSearching={isAiSearching}
            />
            <p className="text-xs text-muted-foreground/70 text-center">
              Digita 2+ lettere per i suggerimenti, poi premi <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> o clicca <strong>AI</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <StatsStrip />

      <div className="container mx-auto max-w-6xl px-4 mt-16 space-y-20">

        {/* AI Search anchor + results */}
        <div id="ai-results-anchor" className="scroll-mt-8" />

        {isAiSearching && (
          <section className="space-y-4" data-testid="section-ai-loading">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(345 55% 32%)" }} />
              <h2 className="text-xl font-serif font-bold tracking-tight">
                L'AI sta analizzando &ldquo;{search || aiQuery}&rdquo;...
              </h2>
            </div>
            <div className="rounded-3xl border border-border/40 p-8 bg-muted/20 animate-pulse h-64" />
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

        {/* Categories */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(345 55% 32%)" }}>
              Esplora per categoria
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
              Cosa stai cercando?
            </h2>
          </div>
          <CategoryCards
            selected={selectedCategory}
            onSelect={(c) => setSelectedCategory(c as Category)}
          />
        </section>

        {/* Luxury catalog grid */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">
                {selectedCategory ? `Prodotti luxury · ${selectedCategory}` : "Catalogo prodotti luxury"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tocca un prodotto per scoprire i suoi dupe con l'AI.
              </p>
            </div>
          </div>
          <LuxuryCatalogGrid category={selectedCategory} onSelectProduct={handleCatalogSelect} />
        </section>

        {/* How it works */}
        <HowItWorks />

      </div>
    </div>
  );
}
