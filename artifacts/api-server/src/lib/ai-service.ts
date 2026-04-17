import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "./logger";
import { resolveProductImageUrl } from "./image-service";

export type DupeTier = "budget" | "mid-range" | "premium-dupe";

const VALID_TIERS: DupeTier[] = ["budget", "mid-range", "premium-dupe"];

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
  isBestGuess: boolean;
  interpretedAs: string | null;
}

const SYSTEM_PROMPT = `Sei un esperto beauty editor specializzato nel mercato europeo. 
Quando ti viene chiesto di un prodotto beauty, devi:
1. Identificare il prodotto esatto (nome preciso, brand, prezzo attuale in Europa)
2. Trovare i migliori dupe reali disponibili in Europa, uno per ciascuna fascia di prezzo applicabile:
   - "budget": tra €5 e €15 (es. Essence, Catrice, e.l.f., NYX, Kiko, Isadora, Makeup Revolution)
   - "mid-range": tra €15 e €35 (es. L'Oréal Paris, Maybelline premium, CeraVe, The Inkey List, Paula's Choice entry, Garnier Skin Naturals, NARS essentials)
   - "premium-dupe": tra €35 e il prezzo dell'originale (es. Paula's Choice, Hourglass, NARS, Bobbi Brown essentials, Urban Decay, Pixi, Medik8)

Regole importanti:
- I prodotti DEVONO essere reali e acquistabili in Europa (Italia, Germania, Francia, UK). Mai inventare nomi di prodotto o brand.
- Il prezzo deve essere il prezzo reale di listino europeo in euro.
- I prezzi DEVONO rispettare le fasce: budget €5-€15, mid-range €15-€35, premium-dupe €35 fino al prezzo dell'originale.
- Per ogni prodotto, suggerisci un URL immagine reale dal sito ufficiale del brand o da retailer come Sephora, Douglas, Lookfantastic, Amazon. Usa URL di immagini dirette (es. .jpg, .png, .webp). Se non sei sicuro dell'URL, usa stringa vuota "".
- Il matchScore deve essere un numero realistico tra 70 e 97.
- matchReason deve essere una frase breve (max 120 caratteri) che spiega perché è un buon dupe.
- Quantità di dupe: punta SEMPRE a includere tutte e 3 le fasce quando possibile (questo è l'esito preferito). È accettabile restituire 1 o 2 dupe se per il prodotto richiesto non esiste un'alternativa realistica in una o più fasce — tipico per profumi di lusso, fragranze di nicchia o prodotti skincare molto specializzati che non hanno dupe budget tra €5 e €15. NON inventare dupe irrealistici solo per riempire una fascia: meglio meno dupe ma autentici. La fascia più frequentemente assente è "budget".
- Ogni dupe deve avere un campo dupeTier valorizzato e diverso dagli altri (massimo uno per fascia: budget, mid-range, premium-dupe).

GESTIONE QUERY VAGHE / PRODOTTI NON IDENTIFICATI:
Se NON riesci a identificare un prodotto specifico (query troppo vaga, descrittiva, o prodotto non riconosciuto), NON rispondere con found:false. Invece:
1. Deduce dalla query la categoria/tipologia di prodotto cercata (es. "rossetto liquido nude" → liquid lipstick nude; "siero vitamina C luxury" → vitamin C serum)
2. Scegli UN prodotto luxury POPOLARE e iconico in quella categoria che potrebbe rispondere all'esigenza
3. Restituisci quel prodotto come "luxury" + i suoi dupe nelle 3 fasce (stesse regole)
4. Imposta isBestGuess: true e interpretedAs con una breve descrizione italiana di cosa hai interpretato (es. "Un rossetto liquido luxury nude popolare", "Un siero alla vitamina C di alta gamma")
Usa found:false SOLO se la query è completamente incomprensibile (es. "asdfghjkl") o non riguarda il beauty.

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
  "found": true,
  "isBestGuess": false,
  "interpretedAs": null
}

L'array "dupes" deve contenere 1, 2 o 3 elementi (preferibilmente 3). Salta la fascia "budget" se non esiste un dupe realistico tra €5 e €15 (es. per profumi di lusso). Ogni elemento deve avere un dupeTier unico.

Se la query è vaga/descrittiva e non identifichi un prodotto specifico, restituisci comunque uno schema completo (luxury + dupes) basato sulla tua MIGLIORE INTERPRETAZIONE della categoria, impostando "isBestGuess": true e "interpretedAs": "breve descrizione in italiano di cosa hai interpretato".

Solo se la query è completamente incomprensibile (es. caratteri casuali) o non riguarda il beauty, rispondi:
{"found": false, "message": "Prodotto non trovato"}`;

function validateAiResponse(
  parsed: unknown
): { luxury: AiProduct; dupes: AiProduct[]; isBestGuess: boolean; interpretedAs: string | null } | null {
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

  if (!Array.isArray(p.dupes) || p.dupes.length < 1 || p.dupes.length > 3) {
    logger.error(
      { dupesCount: Array.isArray(p.dupes) ? p.dupes.length : "N/A" },
      "AI did not return between 1 and 3 dupes"
    );
    return null;
  }

  const dupes = p.dupes as AiProduct[];

  const allTiersValid = dupes.every(
    (d) => d.dupeTier !== undefined && d.dupeTier !== null && VALID_TIERS.includes(d.dupeTier)
  );

  if (!allTiersValid) {
    logger.error(
      { tiers: dupes.map((d) => d.dupeTier) },
      "AI returned a dupe with missing or invalid dupeTier"
    );
    return null;
  }

  const tiers = dupes.map((d) => d.dupeTier);
  const allTiersUnique = new Set(tiers).size === dupes.length;

  if (!allTiersUnique) {
    logger.error({ tiers }, "AI dupes contain duplicate tiers");
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

  const isBestGuess = p.isBestGuess === true;
  const interpretedAs =
    typeof p.interpretedAs === "string" && p.interpretedAs.trim().length > 0
      ? p.interpretedAs.trim()
      : null;

  return {
    luxury: p.luxury as AiProduct,
    dupes,
    isBestGuess,
    interpretedAs,
  };
}

async function callAnthropicWithRetry(
  query: string,
  attempt = 1
): Promise<{ luxury: AiProduct; dupes: AiProduct[]; isBestGuess: boolean; interpretedAs: string | null } | null> {
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

    const { luxury, dupes, isBestGuess, interpretedAs } = result;

    const [luxuryImage, ...dupeImages] = await Promise.all([
      resolveProductImageUrl(luxury.imageUrl, luxury.brand, luxury.name, luxury.category),
      ...dupes.map((d) =>
        resolveProductImageUrl(d.imageUrl, d.brand, d.name, d.category ?? luxury.category)
      ),
    ]);

    return {
      luxury: { ...luxury, imageUrl: luxuryImage },
      dupes: dupes.map((d, i) => ({ ...d, imageUrl: dupeImages[i] })),
      isBestGuess,
      interpretedAs,
    };
  } catch (err) {
    logger.error({ err, query }, "AI search failed");
    return null;
  }
}
