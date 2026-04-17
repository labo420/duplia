import { Search, Sparkles, Wallet } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Cerca un prodotto luxury",
    desc: "Digita il nome di un prodotto beauty di lusso che ti piace, o sceglilo dal catalogo.",
  },
  {
    icon: Sparkles,
    title: "L'AI trova le alternative",
    desc: "Analizziamo migliaia di prodotti europei per trovare i dupe più simili in 3 fasce di prezzo.",
  },
  {
    icon: Wallet,
    title: "Risparmi senza rinunce",
    desc: "Confronta texture, ingredienti e prezzi. Ottieni la stessa qualità a una frazione del costo.",
  },
];

export function HowItWorks() {
  return (
    <section data-testid="section-how-it-works" className="py-8">
      <div className="text-center space-y-3 mb-10">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "hsl(345 55% 32%)" }}
        >
          Come funziona
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
          Tre passaggi per il tuo dupe
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={i}
              className="relative p-7 rounded-3xl bg-card border border-border/40 text-center space-y-3"
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center text-background"
                style={{ background: "hsl(345 55% 32%)" }}
              >
                {i + 1}
              </div>
              <div className="flex justify-center pt-2">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "hsl(345 55% 32% / 0.08)" }}
                >
                  <Icon className="w-6 h-6" style={{ color: "hsl(345 55% 32%)" }} />
                </div>
              </div>
              <h3 className="font-serif text-lg font-bold tracking-tight">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
