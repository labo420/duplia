import { CheckCircle2, XCircle } from "lucide-react";
import type { AiSearchResult } from "@workspace/api-client-react";
import { ProductImage } from "./ProductImage";

interface BestGuessConfirmationProps {
  result: AiSearchResult;
  onConfirm: () => void;
  onReject: () => void;
}

export function BestGuessConfirmation({
  result,
  onConfirm,
  onReject,
}: BestGuessConfirmationProps) {
  const { luxury } = result;

  return (
    <div
      className="rounded-3xl border overflow-hidden bg-card shadow-md"
      style={{ borderColor: "hsl(38 80% 75%)" }}
      data-testid="best-guess-confirmation"
    >
      <div
        className="px-6 pt-5 pb-4 border-b"
        style={{
          background: "hsl(38 90% 97%)",
          borderColor: "hsl(38 80% 82%)",
        }}
      >
        <p
          className="text-sm font-semibold"
          style={{ color: "hsl(38 80% 28%)" }}
        >
          È questo il prodotto che stavi cercando?
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
            <ProductImage
              src={luxury.imageUrl}
              alt={luxury.name}
              category={luxury.category}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Prodotto Luxury
            </p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              {luxury.brand}
            </p>
            <p className="font-serif font-bold text-lg leading-snug line-clamp-2">
              {luxury.name}
            </p>
            <p className="text-base font-semibold mt-1">
              €{luxury.price.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onReject}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-border/60 text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-200"
            data-testid="btn-best-guess-reject"
          >
            <XCircle className="w-4 h-4 shrink-0" />
            No, cerca qualcos'altro
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 shadow-sm"
            style={{ background: "hsl(345 55% 32%)" }}
            data-testid="btn-best-guess-confirm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Sì, mostrami i dupe
          </button>
        </div>
      </div>
    </div>
  );
}
