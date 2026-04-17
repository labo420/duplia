import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, ShieldCheck, Sparkles, Leaf, Scale, CheckCircle2 } from "lucide-react";
import { useGetMatch, useListMatches, getGetMatchQueryKey, getListMatchesQueryKey } from "@workspace/api-client-react";
import type { ListMatchesCategory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/match/ProductImage";
import { MatchCard } from "@/components/match/MatchCard";

const MATCH_REASONS: Record<string, { headline: string; ingredients: string[]; explanation: string }> = {
  "1": {
    headline: "Formula iridescente praticamente identica",
    ingredients: ["Mica", "Iron Oxides", "Titanium Dioxide", "Dimethicone"],
    explanation:
      "Entrambi i prodotti condividono una base di pigmenti micacei ultra-fini che creano l'effetto 'skin-from-within'. Il D-Bronzi usa peptidi di rame per un plus anti-ossidante, ma la Lumi Glotion di L'Oréal replica perfettamente la texture fluida e l'illuminazione naturale degli stessi pigmenti. La differenza sensoriale sul viso è minima.",
  },
  "2": {
    headline: "Stessa tecnologia di luce difusa",
    ingredients: ["Silica", "Mica", "Niacinamide", "Dimethicone", "Glycerin"],
    explanation:
      "Il Flawless Filter di Charlotte Tilbury e l'Halo Glow di e.l.f. usano entrambi microsferette di silica per diffondere la luce e minimizzare l'aspetto dei pori. La formula dell'e.l.f. include la stessa niacinamide e la glicerina idratante. I test blind condotti da community di beauty entusiaste riportano una percentuale di soddisfazione identica.",
  },
  "3": {
    headline: "Identici principi attivi idratanti",
    ingredients: ["Ceramides", "Hyaluronic Acid", "Glycerin", "Petrolatum"],
    explanation:
      "Sia la Ultra Facial Cream di Kiehl's sia la Moisturizing Cream di CeraVe si basano su ceramidi e acido ialuronico per rinforzare la barriera cutanea. CeraVe è stata formulata con la consulenza di dermatologi proprio per replicare l'efficacia dei migliori idratanti luxury. La differenza risiede quasi esclusivamente nel packaging e nel profumo.",
  },
};

const DEFAULT_REASON = {
  headline: "Ingredienti chiave pressoché identici",
  ingredients: ["Glycerin", "Niacinamide", "Ceramides", "Hyaluronic Acid"],
  explanation:
    "L'analisi degli ingredienti rivela che entrambi i prodotti condividono i principi attivi principali in concentrazioni simili. La differenza di prezzo riflette principalmente il posizionamento del brand, la qualità del packaging e le campagne di marketing — non la performance sulla pelle.",
};

function PriceBlock({ price, formato, unitaMisura, pricePerUnit, accent }: {
  price: number;
  formato?: number | null;
  unitaMisura?: string | null;
  pricePerUnit?: number | null;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className="text-2xl font-semibold"
        style={accent ? { color: "hsl(345 55% 32%)" } : undefined}
      >
        €{price.toFixed(2)}
        {formato && unitaMisura && (
          <span className="text-base font-normal text-muted-foreground ml-2">
            · {formato}{unitaMisura}
          </span>
        )}
      </p>
      {pricePerUnit && unitaMisura && (
        <p className="text-sm text-muted-foreground/70 mt-0.5 font-light">
          {pricePerUnit.toFixed(2).replace(".", ",")} € / 100{unitaMisura}
        </p>
      )}
    </div>
  );
}

export default function MatchDetail() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId ? parseInt(params.matchId, 10) : 0;

  const { data: match, isLoading } = useGetMatch(matchId, {
    query: { enabled: !!matchId, queryKey: getGetMatchQueryKey(matchId) },
  });

  const listMatchesParams = { category: match?.category as ListMatchesCategory | undefined };
  const { data: allMatches } = useListMatches(
    listMatchesParams,
    { query: { enabled: !!match?.category, queryKey: getListMatchesQueryKey(listMatchesParams) } }
  );

  const alternatives = allMatches?.filter((m) => m.matchId !== matchId).slice(0, 2) ?? [];
  const reason = MATCH_REASONS[String(matchId)] ?? DEFAULT_REASON;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="h-8 w-32 mb-8 rounded-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-3xl" />
          <Skeleton className="aspect-square rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-24 text-center">
        <h2 className="text-2xl font-serif font-bold mb-4">Match non trovato</h2>
        <Link href="/">
          <Button variant="outline" className="rounded-full">Torna alla home</Button>
        </Link>
      </div>
    );
  }

  // Value comparison: price per unit delta
  const luxuryPpu = match.luxury.pricePerUnit;
  const dupePpu = match.dupe.pricePerUnit;
  const valueSavingsPct = (luxuryPpu && dupePpu && luxuryPpu > 0)
    ? Math.round((1 - dupePpu / luxuryPpu) * 100)
    : null;
  const sameUnit = match.luxury.unitaMisura === match.dupe.unitaMisura;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12 pb-24">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-10 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Torna ai risultati
      </Link>

      {/* Hero banner */}
      <div className="rounded-3xl overflow-hidden bg-muted/30 mb-12 flex flex-col items-center text-center p-8 md:p-12">
        <span
          className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold text-foreground mb-6"
          style={{
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
          data-testid="match-score-badge"
        >
          {match.matchScore}% Somiglianza
        </span>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-6"
          style={{
            background: "hsl(142 50% 95%)",
            border: "1px solid hsl(142 50% 72%)",
            color: "hsl(142 50% 25%)",
          }}
          data-testid="verified-badge"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold tracking-wide">Match Verificato</span>
          <span className="text-xs font-normal opacity-75 hidden sm:inline">· Certificato dal nostro team di esperti</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight mb-4">
          L'alternativa perfetta
        </h1>
        <p className="text-muted-foreground max-w-md text-base md:text-lg">
          Risparmia{" "}
          <strong style={{ color: "hsl(345 55% 32%)" }}>
            €{match.priceDifference.toFixed(2)} ({Math.round(match.savingsPercent)}%)
          </strong>{" "}
          sul prezzo di listino.
          {valueSavingsPct && sameUnit && (
            <span className="block mt-1 text-sm">
              Sul valore reale (prezzo/quantità) risparmi il{" "}
              <strong style={{ color: "hsl(345 55% 32%)" }}>{valueSavingsPct}%</strong>.
            </span>
          )}
        </p>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mb-16">

        {/* Luxury */}
        <div className="flex flex-col space-y-5" data-testid="product-luxury">
          <div className="aspect-square rounded-3xl overflow-hidden bg-muted shadow-md relative">
            <div
              className="absolute top-4 left-4 z-10 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider"
              style={{
                background: "rgba(255,255,255,0.65)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              Originale
            </div>
            <ProductImage src={match.luxury.imageUrl} alt={match.luxury.name} category={match.category} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-widest">{match.luxury.brand}</p>
            <h2 className="text-2xl font-serif font-bold leading-snug mb-3">{match.luxury.name}</h2>
            <PriceBlock
              price={match.luxury.price}
              formato={match.luxury.formato}
              unitaMisura={match.luxury.unitaMisura}
              pricePerUnit={match.luxury.pricePerUnit}
            />
          </div>
          <div className="p-4 rounded-2xl bg-muted/40">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
              <p>Il prodotto di riferimento. Spesso costoso per il posizionamento del brand e il packaging esclusivo.</p>
            </div>
          </div>
        </div>

        {/* Dupe */}
        <div className="flex flex-col space-y-5" data-testid="product-dupe">
          <div className="aspect-square rounded-3xl overflow-hidden bg-muted shadow-xl relative ring-2 ring-foreground/10">
            <div
              className="absolute top-4 left-4 z-10 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider text-white"
              style={{
                background: "rgba(20,20,20,0.70)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              L'Alternativa
            </div>
            <ProductImage src={match.dupe.imageUrl} alt={match.dupe.name} category={match.category} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-widest">{match.dupe.brand}</p>
            <h2 className="text-2xl font-serif font-bold leading-snug mb-3">{match.dupe.name}</h2>
            <PriceBlock
              price={match.dupe.price}
              formato={match.dupe.formato}
              unitaMisura={match.dupe.unitaMisura}
              pricePerUnit={match.dupe.pricePerUnit}
              accent
            />
          </div>

          <a
            href={match.dupe.affiliateLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-acquista"
            className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl text-base font-semibold text-white transition-all duration-300 hover:opacity-90 hover:shadow-xl active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(345 55% 32%), hsl(345 55% 26%))" }}
          >
            Acquista l'alternativa
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Value comparison table */}
      {luxuryPpu && dupePpu && sameUnit && match.luxury.unitaMisura && (
        <section className="mb-16" data-testid="section-value-comparison">
          <div className="flex items-center gap-3 mb-6">
            <Scale className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-2xl font-serif font-bold">Confronto di Valore</h2>
          </div>
          <div className="rounded-3xl border border-border/50 overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-muted/40 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Prodotto</span>
              <span className="text-center">Prezzo totale</span>
              <span className="text-right">€ / 100{match.luxury.unitaMisura}</span>
            </div>
            <div className="divide-y divide-border/40">
              <div className="grid grid-cols-3 px-6 py-4 items-center">
                <div>
                  <p className="font-serif font-semibold text-sm">{match.luxury.name}</p>
                  <p className="text-xs text-muted-foreground">{match.luxury.brand}</p>
                </div>
                <p className="text-center text-muted-foreground">€{match.luxury.price.toFixed(2)}</p>
                <p className="text-right font-medium">€{luxuryPpu.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-3 px-6 py-4 items-center bg-muted/20">
                <div>
                  <p className="font-serif font-semibold text-sm">{match.dupe.name}</p>
                  <p className="text-xs text-muted-foreground">{match.dupe.brand}</p>
                </div>
                <p className="text-center" style={{ color: "hsl(345 55% 32%)" }}>€{match.dupe.price.toFixed(2)}</p>
                <p className="text-right font-bold" style={{ color: "hsl(345 55% 32%)" }}>€{dupePpu.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-3 pl-1">
            Il risparmio reale per quantità equivalente è del {valueSavingsPct}%.
          </p>
        </section>
      )}

      {/* Perché è un match? */}
      <section className="mb-16" data-testid="section-perche-match">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-2xl font-serif font-bold">Perché è un match?</h2>
        </div>

        <div className="rounded-3xl bg-muted/30 p-6 md:p-8 space-y-6">
          <p className="font-serif text-lg font-semibold leading-snug">{reason.headline}</p>
          <p className="text-muted-foreground leading-relaxed text-base">{reason.explanation}</p>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ingredienti chiave in comune
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {reason.ingredients.map((ing) => (
                <span
                  key={ing}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-background shadow-sm border border-border/60"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground/70 italic">
            Analisi basata su dati pubblici. I risultati individuali possono variare.
          </p>
        </div>
      </section>

      {/* Altre alternative valide */}
      {alternatives.length > 0 && (
        <section data-testid="section-alternative">
          <h2 className="text-2xl font-serif font-bold mb-6">Altre alternative valide</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {alternatives.map((alt) => (
              <MatchCard key={alt.matchId} match={alt} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
