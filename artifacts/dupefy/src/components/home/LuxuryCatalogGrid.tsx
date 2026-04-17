import { Sparkles } from "lucide-react";
import { useListLuxuryProducts } from "@workspace/api-client-react";
import type { ListLuxuryProductsCategory } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/match/ProductImage";

interface LuxuryCatalogGridProps {
  category: string | undefined;
  onSelectProduct: (query: string) => void;
}

export function LuxuryCatalogGrid({ category, onSelectProduct }: LuxuryCatalogGridProps) {
  const { data: products, isLoading } = useListLuxuryProducts({
    category: category as ListLuxuryProductsCategory | undefined,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground rounded-3xl border border-dashed border-border">
        Nessun prodotto luxury in questa categoria.
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      data-testid="grid-luxury-catalog"
    >
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelectProduct(`${p.brand} ${p.name}`)}
          className="group text-left rounded-2xl overflow-hidden bg-card border border-border/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          data-testid={`card-luxury-${p.id}`}
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
            <p className="text-[10px] text-muted-foreground/70 pt-0.5">
              Tocca per trovare il dupe →
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
