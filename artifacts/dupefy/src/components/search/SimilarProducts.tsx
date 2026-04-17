import { useLocation } from "wouter";
import { Sparkles } from "lucide-react";
import {
  useListSimilarLuxuryProducts,
  getListSimilarLuxuryProductsQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/match/ProductImage";

interface SimilarProductsProps {
  query: string;
  limit?: number;
}

export function SimilarProducts({ query, limit = 5 }: SimilarProductsProps) {
  const [, navigate] = useLocation();
  const trimmed = query.trim();

  const { data, isLoading } = useListSimilarLuxuryProducts(
    { q: trimmed, limit },
    {
      query: {
        enabled: trimmed.length >= 2,
        queryKey: getListSimilarLuxuryProductsQueryKey({ q: trimmed, limit }),
      },
    }
  );

  if (trimmed.length < 2) return null;

  if (isLoading) {
    return (
      <section className="space-y-4" data-testid="section-similar-loading">
        <h3 className="text-lg font-serif font-bold tracking-tight">Altri prodotti simili</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  const items = data ?? [];

  return (
    <section className="space-y-4" data-testid="section-similar-products">
      <div>
        <h3 className="text-lg font-serif font-bold tracking-tight">Altri prodotti simili</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Esplora altri prodotti dal nostro catalogo legati alla tua ricerca.
        </p>
      </div>
      {items.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground rounded-2xl border border-dashed border-border/60">
          Nessun prodotto correlato nel catalogo per ora — prova a cercare un altro brand o categoria.
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/search?q=${encodeURIComponent(`${p.brand} ${p.name}`)}`)}
            className="group text-left rounded-2xl overflow-hidden bg-card border border-border/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            data-testid={`card-similar-${p.id}`}
          >
            <div className="aspect-square bg-muted overflow-hidden relative">
              <ProductImage src={p.imageUrl} alt={p.name} category={p.category} />
              {p.isAnalyzed && (
                <div className="absolute top-2 right-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold text-foreground"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Sparkles className="w-3 h-3" style={{ color: "hsl(345 55% 32%)" }} />
                    Dupe pronti
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {p.brand}
              </p>
              <p className="font-serif text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">
                {p.name}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
