const CATEGORY_IMAGES: Record<string, string> = {
  Skincare: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop&q=80",
  Makeup: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop&q=80",
  Fragrance: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop&q=80",
  Haircare: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&h=400&fit=crop&q=80",
  Bodycare: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop&q=80",
};

const CATEGORIES = ["Makeup", "Skincare", "Fragrance", "Haircare", "Bodycare"] as const;
type Cat = typeof CATEGORIES[number];

interface CategoryCardsProps {
  selected: string | undefined;
  onSelect: (cat: string | undefined) => void;
}

export function CategoryCards({ selected, onSelect }: CategoryCardsProps) {
  return (
    <section data-testid="section-category-cards">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {CATEGORIES.map((cat) => {
          const isActive = selected === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelect(isActive ? undefined : cat)}
              className={`group relative overflow-hidden rounded-2xl aspect-square transition-all duration-300 ${
                isActive
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background shadow-lg"
                  : "hover:shadow-lg hover:-translate-y-1"
              }`}
              data-testid={`card-category-${cat}`}
            >
              <img
                src={CATEGORY_IMAGES[cat]}
                alt={cat}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex items-end p-4">
                <span className="font-serif text-lg font-bold text-white tracking-tight">
                  {cat}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-4 text-center">
          <button
            onClick={() => onSelect(undefined)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            data-testid="button-clear-category"
          >
            Mostra tutte le categorie
          </button>
        </div>
      )}
    </section>
  );
}

export type { Cat };
