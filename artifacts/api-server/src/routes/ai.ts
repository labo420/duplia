import { Router, type IRouter } from "express";
import { eq, and, ilike, desc, isNull, isNotNull, sql, or, max } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { AiSearchBody } from "@workspace/api-zod";
import { searchProductWithAI } from "../lib/ai-service";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const STALENESS_DAYS: Record<string, number> = {
  Makeup: 30,
  Fragrance: 30,
  Skincare: 60,
  Haircare: 60,
  Bodycare: 60,
};

function calcPricePerUnit(price: number, formato: number | null | undefined): number | null {
  if (!formato || formato <= 0) return null;
  return Math.round((price / formato * 100) * 100) / 100;
}

function mapProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    imageUrl: p.imageUrl,
    affiliateLink: p.affiliateLink,
    category: p.category,
    type: p.type,
    matchId: p.matchId,
    matchScore: p.matchScore,
    formato: p.formato ?? null,
    unitaMisura: p.unitaMisura ?? null,
    pricePerUnit: calcPricePerUnit(p.price, p.formato),
    dupeTier: p.dupeTier ?? null,
    luxuryGroupId: p.luxuryGroupId ?? null,
    aiMatchReason: p.aiMatchReason ?? null,
  };
}

function isStale(lastChecked: Date | null | undefined, category: string): boolean {
  if (!lastChecked) return true;
  const daysOld = (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60 * 24);
  const maxDays = STALENESS_DAYS[category] ?? 60;
  return daysOld > maxDays;
}

async function getNextMatchId(): Promise<number> {
  const result = await db
    .select({ matchId: productsTable.matchId })
    .from(productsTable)
    .orderBy(desc(productsTable.matchId))
    .limit(1);
  return (result[0]?.matchId ?? 0) + 1;
}

async function getNextGroupId(): Promise<number> {
  const result = await db
    .select({ maxGroupId: max(productsTable.luxuryGroupId) })
    .from(productsTable)
    .where(isNotNull(productsTable.luxuryGroupId));
  return (result[0]?.maxGroupId ?? 0) + 1;
}

interface SavedAiGroup {
  luxuryGroupId: number;
  luxury: ReturnType<typeof mapProduct>;
  dupes: ReturnType<typeof mapProduct>[];
  lastAiCheckedAt: string;
}

async function saveAiResult(query: string, oldGroupId?: number): Promise<SavedAiGroup | null> {
  const aiResult = await searchProductWithAI(query);
  if (!aiResult) return null;

  if (oldGroupId) {
    await db.delete(productsTable).where(eq(productsTable.luxuryGroupId, oldGroupId));
  }

  const now = new Date();
  const newGroupId = await getNextGroupId();
  const luxuryMatchId = await getNextMatchId();

  const [savedLuxury] = await db
    .insert(productsTable)
    .values({
      name: aiResult.luxury.name,
      brand: aiResult.luxury.brand,
      price: aiResult.luxury.price,
      imageUrl: aiResult.luxury.imageUrl,
      affiliateLink: "",
      category: aiResult.luxury.category,
      type: "Luxury",
      matchId: luxuryMatchId,
      matchScore: 100,
      formato: aiResult.luxury.formato ?? null,
      unitaMisura: aiResult.luxury.unitaMisura ?? null,
      dupeTier: null,
      lastAiCheckedAt: now,
      luxuryGroupId: newGroupId,
      aiMatchReason: null,
    })
    .returning();

  const savedDupes: (typeof productsTable.$inferSelect)[] = [];

  for (const dupe of aiResult.dupes) {
    const dupeMatchId = await getNextMatchId();

    const [savedDupe] = await db
      .insert(productsTable)
      .values({
        name: dupe.name,
        brand: dupe.brand,
        price: dupe.price,
        imageUrl: dupe.imageUrl,
        affiliateLink: "",
        category: (dupe.category ?? aiResult.luxury.category) as typeof aiResult.luxury.category,
        type: "Dupe",
        matchId: dupeMatchId,
        matchScore: dupe.matchScore ?? 85,
        formato: dupe.formato ?? null,
        unitaMisura: dupe.unitaMisura ?? null,
        dupeTier: dupe.dupeTier ?? null,
        lastAiCheckedAt: now,
        luxuryGroupId: newGroupId,
        aiMatchReason: dupe.matchReason ?? null,
      })
      .returning();

    savedDupes.push(savedDupe);
  }

  logger.info(
    { query, luxuryGroupId: newGroupId, luxuryMatchId, dupesCount: savedDupes.length },
    "AI search result saved (1 luxury + 3 dupes)"
  );

  return {
    luxuryGroupId: newGroupId,
    luxury: mapProduct(savedLuxury),
    dupes: savedDupes.map(mapProduct),
    lastAiCheckedAt: now.toISOString(),
  };
}

router.post("/ai/search", async (req, res): Promise<void> => {
  const bodyParsed = AiSearchBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const { query } = bodyParsed.data;

  try {
    const q = query.trim();

    if (q.length < 3) {
      res.status(400).json({ error: "La ricerca deve contenere almeno 3 caratteri." });
      return;
    }

    const existingLuxury = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.type, "Luxury"),
          isNotNull(productsTable.luxuryGroupId),
          or(
            ilike(sql`${productsTable.brand} || ' ' || ${productsTable.name}`, `%${q}%`),
            ilike(productsTable.name, `${q}%`)
          )
        )
      )
      .orderBy(desc(productsTable.lastAiCheckedAt))
      .limit(1);

    const foundLuxury = existingLuxury[0];
    const luxuryGroupId = foundLuxury?.luxuryGroupId;

    if (foundLuxury && luxuryGroupId) {
      const groupProducts = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.luxuryGroupId, luxuryGroupId));

      const luxuries = groupProducts.filter((p) => p.type === "Luxury");
      const dupes = groupProducts.filter((p) => p.type === "Dupe");
      const hasValidGroup = luxuries.length > 0 && dupes.length === 3;

      if (hasValidGroup) {
        const cachedResponse = {
          luxuryGroupId,
          luxury: mapProduct(luxuries[0]),
          dupes: dupes.map(mapProduct),
          lastAiCheckedAt: luxuries[0].lastAiCheckedAt?.toISOString() ?? new Date().toISOString(),
          isFromCache: true,
        };

        if (!isStale(foundLuxury.lastAiCheckedAt, foundLuxury.category)) {
          logger.info({ query, luxuryGroupId }, "Returning fresh cached AI result");
          res.json(cachedResponse);
          return;
        }

        logger.info({ query, luxuryGroupId }, "Returning stale cached AI result — refreshing in background");
        res.json(cachedResponse);

        setImmediate(() => {
          saveAiResult(query, luxuryGroupId).catch((err) =>
            logger.error({ err, query, luxuryGroupId }, "Background AI refresh failed")
          );
        });
        return;
      }
    }

    const saved = await saveAiResult(query, luxuryGroupId ?? undefined);

    if (!saved) {
      res.status(404).json({
        message: "Prodotto non trovato. Prova con un nome più specifico (es. 'Charlotte Tilbury Flawless Filter').",
      });
      return;
    }

    res.json({ ...saved, isFromCache: false });
  } catch (err) {
    logger.error({ err, query }, "AI search route error");
    res.status(500).json({ error: "Errore interno durante la ricerca AI" });
  }
});

export default router;
