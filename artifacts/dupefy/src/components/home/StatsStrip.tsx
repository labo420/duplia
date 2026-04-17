import { useGetStats } from "@workspace/api-client-react";

export function StatsStrip() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading || !stats) {
    return (
      <section className="border-y border-border/40 bg-muted/20">
        <div className="container mx-auto max-w-5xl px-4 py-8 grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/30" />
          ))}
        </div>
      </section>
    );
  }

  const items = [
    { value: stats.luxuryProductsCount, label: "Prodotti luxury catalogati" },
    { value: stats.analyzedCount, label: "Analisi AI già pronte" },
    { value: stats.avgSavingsPercent > 0 ? `${stats.avgSavingsPercent}%` : "—", label: "Risparmio medio" },
  ];

  return (
    <section className="border-y border-border/40 bg-muted/20" data-testid="section-stats">
      <div className="container mx-auto max-w-5xl px-4 py-8 grid grid-cols-3 gap-4 text-center">
        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <p
              className="text-2xl md:text-4xl font-serif font-bold tracking-tight"
              style={{ color: "hsl(345 55% 32%)" }}
            >
              {item.value}
            </p>
            <p className="text-[11px] md:text-xs text-muted-foreground uppercase tracking-wider">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
