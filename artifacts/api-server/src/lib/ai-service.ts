import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "./logger";
import { resolveProductImageUrl } from "./image-service";

export type DupeTier = "budget" | "mid-range" | "premium-dupe";

const REQUIRED_TIERS: DupeTier[] = ["budget", "mid-range", "premium-dupe"];

const TIER_PRICE_BANDS: Record<DupeTier, [number, number]> = {
  budget: [5, 15],
  "mid-range": [15, 35],
  "premium-dupe": [35, Infinity],
};

export interface AiProduct {
  name: string;
  brand: string;
  price: number;
  category: "Skincare" | "Makeup" | "Haircare" | "Bodycare" | "Fragrance";
  imageUrl: string;
  matchScore: number;
  dupeTier?: DupeTier;
  matchReason: string;
  formato?: number | null;
  unitaMisura?: string | null;
}

export interface AiSearchPayload {
  luxury: AiProduct;
  dupes: AiProduct[];
}

const SYSTEM_PROMPT = `Sei un esperto beauty editor specializzato nel mercato europeo. 
Quando ti viene chiesto di un prodotto beauty, devi:
1. Identificare il prodotto esatto (nome preciso, brand, prezzo attuale in Europa)
2. Trovare esattamente 3 dupe reali disponibili in Europa, uno per ogni fascia di prezzo:
   - "budget": tra €5 e €15 (es. Essence, Catrice, e.l.f., NYX, Kiko, Isadora, Makeup Revolution)
   - "mid-range": tra €15 e €35 (es. L'Oréal Paris, Maybelline premium, CeraVe, The Inkey List, Paula's Choice entry, Garnier Skin Naturals, NARS essentials)
   - "premium-dupe": tra €35 e il prezzo dell'originale (es. Paula's Choice, Hourglass, NARS, Bobbi Brown essentials, Urban Decay, Pixi, Medik8)

Regole importanti:
- I prodotti DEVONO essere reali e acquistabili in Europa (Italia, Germania, Francia, UK)
- Il prezzo deve essere il prezzo reale di listino europeo in euro
- I prezzi DEVONO rispettare le fasce: budget €5-€15, mid-range €15-€35, premium-dupe €35+
- Per ogni prodotto, suggerisci un URL immagine reale dal sito ufficiale del brand o da retailer come Sephora, Douglas, Lookfantastic, Amazon. Usa URL di immagini dirette (es. .jpg, .png, .webp). Se non sei sicuro dell'URL, usa stringa vuota "".
- Il matchScore deve essere un numero realistico tra 70 e 97
- matchReason deve essere una frase breve (max 120 caratteri) che spiega perché è un buon dupe
- Devi includere ESATTAMENTE 3 dupe: uno "budget", uno "mid-range", uno "premium-dupe"

Rispondi SOLO con JSON valido, nessun testo aggiuntivo.`;

const USER_PROMPT_TEMPLATE = (query: string) => `Cerca il prodotto beauty: "${query}"

Rispondi con questo schema JSON esatto:
{
  "luxury": {
    "name": "nome preciso prodotto",
    "brand": "nome brand",
    "price": 49.90,
    "category": "Skincare|Makeup|Haircare|Bodycare|Fragrance",
    "imageUrl": "https://...",
    "matchScore": 100,
    "matchReason": "Prodotto originale di riferimento",
    "formato": 30,
    "unitaMisura": "ml"
  },
  "dupes": [
    {
      "name": "nome dupe budget",
      "brand": "brand",
      "price": 9.99,
      "category": "stessa categoria del luxury",
      "imageUrl": "https://...",
      "matchScore": 87,
      "dupeTier": "budget",
      "matchReason": "Stessa tecnologia di illuminazione con pigmenti simili",
      "formato": 25,
      "unitaMisura": "ml"
    },
    {
      "name": "nome dupe mid-range",
      "brand": "brand",
      "price": 24.99,
      "category": "stessa categoria del luxury",
      "imageUrl": "https://...",
      "matchScore": 91,
      "dupeTier": "mid-range",
      "matchReason": "Formula quasi identica con ingredienti attivi equivalenti",
      "formato": 28,
      "unitaMisura": "ml"
    },
    {
      "name": "nome dupe premium",
      "brand": "brand",
      "price": 39.00,
      "category": "stessa categoria del luxury",
      "imageUrl": "https://...",
      "matchScore": 95,
      "dupeTier": "premium-dupe",
      "matchReason": "Performance identica con packaging premium equivalente",
      "formato": 30,
      "unitaMisura": "ml"
    }
  ],
  "found": true
}

Se il prodotto non esiste o non riesci a identificarlo con certezza, rispondi:
{"found": false, "message": "Prodotto non trovato"}`;

function validateAiResponse(parsed: unknown): { luxury: AiProduct; dupes: AiProduct[] } | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;

  if (!p.found) {
    logger.info({ message: p.message }, "Product not found by AI");
    return null;
  }

  if (!p.luxury || typeof p.luxury !== "object") {
    logger.error({ parsed }, "Missing luxury product in AI response");
    return null;
  }

  if (!Array.isArray(p.dupes) || p.dupes.length !== 3) {
    logger.error({ dupesCount: Array.isArray(p.dupes) ? p.dupes.length : "N/A" }, "AI did not return exactly 3 dupes");
    return null;
  }

  const dupes = p.dupes as AiProduct[];
  const tiers = dupes.map((d) => d.dupeTier);
  const allTiersPresent = REQUIRED_TIERS.every((t) => tiers.includes(t));
  const allTiersUnique = new Set(tiers).size === 3;

  if (!allTiersPresent || !allTiersUnique) {
    logger.error({ tiers }, "AI dupes missing required tiers or have duplicate tiers");
    return null;
  }

  for (const dupe of dupes) {
    const tier = dupe.dupeTier;
    if (!tier || !(tier in TIER_PRICE_BANDS)) continue;
    const [min, max] = TIER_PRICE_BANDS[tier];
    if (dupe.price < min * 0.8 || dupe.price > max * 1.3) {
      logger.warn(
        { tier, price: dupe.price, min, max },
        "Dupe price is outside expected band — keeping but noting discrepancy"
      );
    }
  }

  return {
    luxury: p.luxury as AiProduct,
    dupes,
  };
}

async function callAnthropicWithRetry(query: string, attempt = 1): Promise<{ luxury: AiProduct; dupes: AiProduct[] } | null> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: USER_PROMPT_TEMPLATE(query),
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    logger.error("AI returned unexpected content type");
    return null;
  }

  const text = block.text.trim();
  logger.info({ responseLength: text.length, attempt }, "AI responded");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.error({ text }, "No JSON found in AI response");
    return null;
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validated = validateAiResponse(parsed);

  if (!validated && attempt < 2) {
    logger.warn({ attempt }, "AI response failed validation — retrying once");
    return callAnthropicWithRetry(query, attempt + 1);
  }

  return validated;
}

export async function searchProductWithAI(query: string): Promise<AiSearchPayload | null> {
  try {
    logger.info({ query }, "Calling AI to search product");

    const result = await callAnthropicWithRetry(query);
    if (!result) return null;

    const { luxury, dupes } = result;

    const [luxuryImage, ...dupeImages] = await Promise.all([
      resolveProductImageUrl(luxury.imageUrl, luxury.brand, luxury.name, luxury.category),
      ...dupes.map((d) =>
        resolveProductImageUrl(d.imageUrl, d.brand, d.name, d.category ?? luxury.category)
      ),
    ]);

    return {
      luxury: { ...luxury, imageUrl: luxuryImage },
      dupes: dupes.map((d, i) => ({ ...d, imageUrl: dupeImages[i] })),
    };
  } catch (err) {
    logger.error({ err, query }, "AI search failed");
    return null;
  }
}
