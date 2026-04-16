import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "./logger";

export type DupeTier = "budget" | "mid-range" | "premium-dupe";

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
- Per ogni prodotto, suggerisci un URL immagine reale dal sito ufficiale del brand o da retailer come Sephora, Douglas, Lookfantastic, Amazon
- Se non conosci l'URL esatto dell'immagine, usa una stringa vuota "" (NON inventare URL)
- Il matchScore deve essere un numero realistico tra 70 e 97
- matchReason deve essere una frase breve (max 120 caratteri) che spiega perché è un buon dupe

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

export async function searchProductWithAI(query: string): Promise<AiSearchPayload | null> {
  try {
    logger.info({ query }, "Calling AI to search product");

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
    logger.info({ responseLength: text.length }, "AI responded");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error({ text }, "No JSON found in AI response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.found) {
      logger.info({ query, message: parsed.message }, "Product not found by AI");
      return null;
    }

    if (!parsed.luxury || !Array.isArray(parsed.dupes) || parsed.dupes.length === 0) {
      logger.error({ parsed }, "Invalid AI response structure");
      return null;
    }

    return {
      luxury: parsed.luxury as AiProduct,
      dupes: parsed.dupes as AiProduct[],
    };
  } catch (err) {
    logger.error({ err, query }, "AI search failed");
    return null;
  }
}
