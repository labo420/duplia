import React from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { useGetMatch, getGetMatchQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function MatchDetail() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId ? parseInt(params.matchId, 10) : 0;

  const { data: match, isLoading } = useGetMatch(matchId, {
    query: {
      enabled: !!matchId,
      queryKey: getGetMatchQueryKey(matchId)
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
           <Skeleton className="aspect-square rounded-2xl" />
           <Skeleton className="aspect-square rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Match non trovato</h2>
        <Link href="/">
          <Button variant="outline">Torna alla home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12 pb-24">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Torna ai risultati
      </Link>

      <div className="bg-muted/20 border border-border rounded-3xl p-6 md:p-10 mb-8 flex flex-col items-center text-center">
         <Badge className="bg-foreground text-background hover:bg-foreground px-4 py-1.5 text-sm mb-4">
           {match.matchScore}% Somiglianza
         </Badge>
         <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">L'alternativa perfetta</h1>
         <p className="text-muted-foreground max-w-lg">
           Risparmia <strong className="text-destructive font-bold">€{match.priceDifference.toFixed(2)}</strong> scegliendo questa opzione super valutata invece del prodotto di lusso originale.
         </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        
        {/* Luxury Product */}
        <div className="flex flex-col space-y-6">
          <div className="aspect-square bg-muted rounded-2xl border border-border flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-4 left-4 bg-background/80 backdrop-blur text-xs font-semibold px-3 py-1 rounded-full border border-border uppercase tracking-wider">
              Originale
            </div>
            {/* Square placeholder image */}
            <div className="w-48 h-48 bg-card rounded-xl shadow-sm border border-border flex items-center justify-center p-4">
              <span className="text-xl text-muted-foreground text-center">{match.luxury.brand}</span>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">{match.luxury.brand}</p>
            <h2 className="text-2xl font-bold mb-2">{match.luxury.name}</h2>
            <p className="text-xl text-muted-foreground">€{match.luxury.price.toFixed(2)}</p>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-xl border border-border">
             <div className="flex items-start gap-3 text-sm text-muted-foreground">
               <ShieldCheck className="w-5 h-5 text-foreground shrink-0" />
               <p>Il prodotto di riferimento sul mercato. Spesso costoso per via del posizionamento del brand e packaging.</p>
             </div>
          </div>
        </div>

        {/* Dupe Product */}
        <div className="flex flex-col space-y-6">
          <div className="aspect-square bg-muted/40 rounded-2xl border border-border flex items-center justify-center relative overflow-hidden ring-4 ring-background shadow-xl">
            <div className="absolute top-4 left-4 bg-foreground text-background text-xs font-semibold px-3 py-1 rounded-full border border-border uppercase tracking-wider">
              L'Alternativa
            </div>
            {/* Square placeholder image */}
            <div className="w-48 h-48 bg-card rounded-xl shadow-sm border border-border flex items-center justify-center p-4">
              <span className="text-xl text-muted-foreground text-center">{match.dupe.brand}</span>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">{match.dupe.brand}</p>
            <h2 className="text-2xl font-bold mb-2">{match.dupe.name}</h2>
            <p className="text-xl font-semibold">€{match.dupe.price.toFixed(2)}</p>
          </div>

          <div className="flex-1" />

          <Button 
            size="lg" 
            className="w-full h-14 text-base font-semibold rounded-xl bg-foreground hover:bg-foreground/90 text-background"
            asChild
          >
            <a href={match.dupe.affiliateLink || "#"} target="_blank" rel="noopener noreferrer">
              Acquista l'alternativa <ExternalLink className="ml-2 w-4 h-4" />
            </a>
          </Button>
        </div>

      </div>
    </div>
  );
}
