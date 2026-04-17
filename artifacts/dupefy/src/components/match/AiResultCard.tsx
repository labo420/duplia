import { Link } from "wouter";
import { Sparkles, ShoppingBag } from "lucide-react";
import type { AiSearchResult } from "@workspace/api-client-react";
import { ProductImage } from "./ProductImage";

const TIER_CONFIG = {
  budget: {
    label: "Best Budget",
    sublabel: "€5 – €15",
    color: "hsl(142 50% 30%)",
    bg: "hsl(142 50% 95%)",
    border: "hsl(142 50% 80%)",
  },
  "mid-range": {
    label: "Mid-Range",
    sublabel: "€15 – €35",
    color: "hsl(221 60% 35%)",
    bg: "hsl(221 60% 95%)",
    border: "hsl(221 60% 80%)",
  },
  "premium-dupe": {
    label: "Premium Dupe",
    sublabel: "€35+",
    color: "hsl(345 55% 32%)",
    bg: "hsl(345 55% 96%)",
    border: "hsl(345 55% 80%)",
  },
};

interface AiResultCardProps {
  result: AiSearchResult;
  query: string;
}

export function AiResultCard({ result, query }: AiResultCardProps) {
  const { luxury, dupes } = result;

  const budgetDupe = dupes.find((d) => d.dupeTier === "budget");
  const midRangeDupe = dupes.find((d) => d.dupeTier === "mid-range");
  const premiumDupe = dupes.find((d) => d.dupeTier === "premium-dupe");

  const orderedDupes = [budgetDupe, midRangeDupe, premiumDupe].filter(Boolean) as typeof dupes;

  return (
    <div className="rounded-3xl border border-border/60 overflow-hidden bg-card shadow-lg">
      <div className="px-6 pt-6 pb-4 border-b border-border/40 flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "hsl(345 55% 32%)" }} />
          <span>Risultato AI</span>
        </div>
        <p className="text-sm text-muted-foreground">
          per <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
        </p>
        {result.isFromCache && (
          <span className="ml-auto text-xs text-muted-foreground/60">dalla memoria</span>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
            <ProductImage src={luxury.imageUrl} alt={luxury.name} category={luxury.category} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Prodotto Originale
            </p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              {luxury.brand}
            </p>
            <p className="font-serif font-bold text-lg leading-snug line-clamp-2">{luxury.name}</p>
            <p className="text-base font-semibold mt-1">€{luxury.price.toFixed(2)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            {orderedDupes.length === 1
              ? "1 Dupe Consigliato dall'AI"
              : `${orderedDupes.length} Dupe Consigliati dall'AI`}
          </p>

          <div
            className={`grid grid-cols-1 gap-4 ${
              orderedDupes.length === 1
                ? "sm:grid-cols-1 sm:max-w-sm sm:mx-auto"
                : orderedDupes.length === 2
                  ? "sm:grid-cols-2"
                  : "sm:grid-cols-3"
            }`}
          >
            {orderedDupes.map((dupe) => {
              const tier = dupe.dupeTier as keyof typeof TIER_CONFIG | null;
              const config = tier ? TIER_CONFIG[tier] : TIER_CONFIG.budget;
              const savings = luxury.price > 0
                ? Math.round(((luxury.price - dupe.price) / luxury.price) * 100)
                : 0;

              return (
                <Link
                  key={dupe.id}
                  href={`/match/${dupe.matchId}`}
                  data-testid={`ai-dupe-${dupe.dupeTier}`}
                >
                  <div
                    className="group flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer h-full"
                    style={{ borderColor: config.border }}
                  >
                    <div className="aspect-square overflow-hidden bg-muted relative">
                      <ProductImage src={dupe.imageUrl} alt={dupe.name} category={dupe.category} />
                      <div
                        className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}
                      >
                        {config.label}
                      </div>
                      {savings > 0 && (
                        <div
                          className="absolute bottom-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold text-white"
                          style={{ background: config.color }}
                        >
                          -{savings}%
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col">
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">
                        {config.sublabel}
                      </p>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{dupe.brand}</p>
                      <p className="font-serif font-semibold text-sm leading-snug line-clamp-2 flex-1">{dupe.name}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="font-bold text-base" style={{ color: config.color }}>
                          €{dupe.price.toFixed(2)}
                        </p>
                        <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          <ShoppingBag className="w-3 h-3" />
                          Scopri
                        </span>
                      </div>
                      {dupe.aiMatchReason && (
                        <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed line-clamp-2 italic">
                          {dupe.aiMatchReason}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
