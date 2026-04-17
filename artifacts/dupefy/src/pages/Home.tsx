import { useState } from "react";
import { useLocation } from "wouter";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { StatsStrip } from "@/components/home/StatsStrip";
import { CategoryCards } from "@/components/home/CategoryCards";
import { LuxuryCatalogGrid } from "@/components/home/LuxuryCatalogGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { useRecentSearches } from "@/hooks/use-recent-searches";

type Category = "Skincare" | "Makeup" | "Haircare" | "Bodycare" | "Fragrance" | undefined;

export default function Home() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>(undefined);
  const { recentSearches, clearRecentSearches } = useRecentSearches();

  function handleAiSearch(q?: string) {
    const query = (q ?? search).trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleCatalogSelect(query: string) {
    navigate(`/search?q=${encodeURIComponent(query)}`);
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
              isSearching={false}
              recentSearches={recentSearches}
              onClearRecentSearches={clearRecentSearches}
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
                Tocca un prodotto per trovare i match verificati dal nostro team.
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
