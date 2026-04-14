import React from "react";
import { Link } from "wouter";
import { ProductMatch } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MatchCardProps {
  match: ProductMatch;
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <Link href={`/match/${match.matchId}`}>
      <Card className="group cursor-pointer overflow-hidden border-border shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl h-full flex flex-col">
        <CardContent className="p-0 flex flex-col h-full relative">
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-foreground text-background font-medium hover:bg-foreground">
              {match.matchScore}% Somiglianza
            </Badge>
          </div>
          <div className="flex relative">
            <div className="w-1/2 aspect-square bg-muted flex items-center justify-center border-r border-border">
               {/* Product Image Placeholder */}
               <div className="w-24 h-24 bg-card rounded-md shadow-sm border border-border flex items-center justify-center p-2">
                 <span className="text-xs text-muted-foreground text-center truncate">{match.luxury.brand}</span>
               </div>
            </div>
            <div className="w-1/2 aspect-square bg-muted/50 flex items-center justify-center">
               {/* Product Image Placeholder */}
               <div className="w-24 h-24 bg-card rounded-md shadow-sm border border-border flex items-center justify-center p-2">
                 <span className="text-xs text-muted-foreground text-center truncate">{match.dupe.brand}</span>
               </div>
            </div>
            {/* VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center shadow-sm z-10 text-xs font-semibold text-muted-foreground">
              VS
            </div>
          </div>
          
          <div className="p-5 flex-1 flex flex-col">
            <div className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">{match.category}</div>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Luxury</p>
                <p className="font-semibold text-sm leading-tight line-clamp-2">{match.luxury.name}</p>
                <p className="text-muted-foreground text-xs mt-1">€{match.luxury.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Dupefy</p>
                <p className="font-semibold text-sm leading-tight line-clamp-2">{match.dupe.name}</p>
                <p className="text-foreground font-medium text-xs mt-1">€{match.dupe.price.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-auto pt-4 flex items-center justify-between border-t border-border mt-4">
               <div className="flex flex-col">
                 <span className="text-xs text-muted-foreground">Risparmi</span>
                 <span className="font-bold text-destructive">€{match.priceDifference.toFixed(2)} ({match.savingsPercent}%)</span>
               </div>
               <span className="text-sm font-medium text-foreground group-hover:underline underline-offset-4">Scopri</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
