import { Link } from "wouter";
import { ProductMatch } from "@workspace/api-client-react/src/generated/api.schemas";
import { ProductImage } from "./ProductImage";

interface MatchCardProps {
  match: ProductMatch;
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <Link href={`/match/${match.matchId}`} data-testid={`card-match-${match.matchId}`}>
      <div className="group cursor-pointer overflow-hidden rounded-3xl bg-card shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1 h-full flex flex-col">
        {/* Image area */}
        <div className="flex relative overflow-hidden">
          <div className="w-1/2 aspect-square bg-muted overflow-hidden">
            <ProductImage
              src={match.luxury.imageUrl}
              alt={match.luxury.name}
              category={match.category}
            />
          </div>
          <div className="w-1/2 aspect-square bg-muted/60 overflow-hidden">
            <ProductImage
              src={match.dupe.imageUrl}
              alt={match.dupe.name}
              category={match.category}
            />
          </div>

          {/* Match Score badge — blur glass effect */}
          <div className="absolute top-3 left-3 z-10">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-foreground"
              style={{
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              {match.matchScore}% Somiglianza
            </span>
          </div>

          {/* VS badge */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-background rounded-full flex items-center justify-center shadow-md z-10 text-[10px] font-bold text-muted-foreground">
            VS
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="text-[10px] font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
            {match.category}
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Originale</p>
              <p className="font-serif font-semibold text-sm leading-snug line-clamp-2">{match.luxury.name}</p>
              <p className="text-muted-foreground text-sm mt-1">€{match.luxury.price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Alternativa</p>
              <p className="font-serif font-semibold text-sm leading-snug line-clamp-2">{match.dupe.name}</p>
              <p className="text-sm mt-1" style={{ color: "hsl(345 55% 32%)" }}>
                €{match.dupe.price.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 flex items-center justify-between border-t border-border/50">
            <div>
              <span className="text-xs text-muted-foreground block">Risparmi</span>
              <span className="font-bold text-sm" style={{ color: "hsl(345 55% 32%)" }}>
                €{match.priceDifference.toFixed(2)} &middot; {Math.round(match.savingsPercent)}%
              </span>
            </div>
            <span className="text-sm font-medium text-foreground group-hover:underline underline-offset-4 transition-all">
              Scopri
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
