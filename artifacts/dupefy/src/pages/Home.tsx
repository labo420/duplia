import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchCard } from "@/components/match/MatchCard";
import { 
  useListMatches, 
  useGetCategorySummary, 
  useGetTrending,
  useListProducts
} from "@workspace/api-client-react";
import { ListMatchesCategory } from "@workspace/api-client-react/src/generated/api.schemas";

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ListMatchesCategory | undefined>();

  const { data: categorySummary } = useGetCategorySummary();
  const { data: trendingMatches, isLoading: isLoadingTrending } = useGetTrending();
  const { data: matches, isLoading: isLoadingMatches } = useListMatches({
    search: search || undefined,
    category: selectedCategory,
  });
  
  const { data: products } = useListProducts({ category: selectedCategory });

  return (
    <div className="flex-1 w-full pb-20">
      {/* Hero Section */}
      <section className="bg-muted/30 py-16 md:py-24 border-b border-border px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            L'alternativa perfetta<br />al lusso che ami.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Scopri le migliori alternative economiche ai prodotti di bellezza iconici, curati per te.
          </p>
          
          <div className="max-w-xl mx-auto mt-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Cerca un prodotto, un brand o un dupe..." 
              className="pl-12 h-14 text-base rounded-full shadow-sm bg-background border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 mt-12 space-y-16">
        
        {/* Categories */}
        <section className="flex flex-col items-center space-y-6">
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={() => setSelectedCategory(undefined)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Tutti i prodotti
            </button>
            {categorySummary?.map((cat) => (
              <button 
                key={cat.category}
                onClick={() => setSelectedCategory(cat.category as ListMatchesCategory)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.category ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {cat.category} <span className="ml-1 opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
        </section>

        {/* Trending Section */}
        {!search && !selectedCategory && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Trend del Momento</h2>
            </div>
            
            {isLoadingTrending ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-[400px] rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingMatches?.map(match => (
                  <MatchCard key={match.matchId} match={match} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Main Feed */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">
            {search ? 'Risultati della ricerca' : selectedCategory ? `Tutti in ${selectedCategory}` : 'Scopri i Dupe'}
          </h2>
          
          {isLoadingMatches ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[400px] rounded-2xl" />)}
            </div>
          ) : matches?.length === 0 ? (
             <div className="py-20 text-center text-muted-foreground border border-dashed rounded-2xl">
               Nessun risultato trovato per la tua ricerca.
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches?.map(match => (
                <MatchCard key={match.matchId} match={match} />
              ))}
            </div>
          )}
        </section>

        {/* Display single products section just to use the useListProducts hook as requested */}
        {products && products.length > 0 && (
           <section className="space-y-6 pt-12 border-t border-border">
             <h2 className="text-2xl font-bold tracking-tight">Esplora Prodotti Singoli</h2>
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.slice(0, 5).map(product => (
                  <div key={product.id} className="border border-border rounded-xl p-4 flex flex-col items-center text-center">
                     <div className="w-full aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center p-2">
                       <span className="text-xs text-muted-foreground">{product.brand}</span>
                     </div>
                     <span className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{product.type}</span>
                     <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                     <p className="text-muted-foreground mt-2 text-sm">€{product.price.toFixed(2)}</p>
                  </div>
                ))}
             </div>
           </section>
        )}

      </div>
    </div>
  );
}
