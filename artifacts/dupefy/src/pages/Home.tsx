import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchCard } from "@/components/match/MatchCard";
import {
  useListMatches,
  useGetCategorySummary,
  useGetTrending,
} from "@workspace/api-client-react";

type Category = "Skincare" | "Makeup" | "Profumi" | undefined;

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>(undefined);

  const { data: categorySummary } = useGetCategorySummary();
  const { data: trendingMatches, isLoading: isLoadingTrending } = useGetTrending();
  const { data: matches, isLoading: isLoadingMatches } = useListMatches({
    search: search || undefined,
    category: selectedCategory as string | undefined,
  });

  const isFiltering = !!search || !!selectedCategory;

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

          <div className="max-w-xl mx-auto mt-10 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Cerca un prodotto, un brand o un dupe..."
              className="pl-12 h-14 text-base rounded-full shadow-sm bg-background border-border/40 focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
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

        {/* Trend del Momento */}
        {!isFiltering && (
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
              ? "Risultati della ricerca"
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
          ) : matches?.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground rounded-3xl border border-dashed border-border">
              Nessun risultato trovato.
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
