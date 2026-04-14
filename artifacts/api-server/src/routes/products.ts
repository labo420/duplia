import { Router, type IRouter } from "express";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  ListMatchesQueryParams,
  ListMatchesResponse,
  GetMatchParams,
  GetMatchResponse,
  GetCategorySummaryResponse,
  GetTrendingResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  const conditions = [];

  if (params.success && params.data.category) {
    conditions.push(eq(productsTable.category, params.data.category));
  }
  if (params.success && params.data.search) {
    const term = `%${params.data.search}%`;
    conditions.push(
      or(
        ilike(productsTable.name, term),
        ilike(productsTable.brand, term)
      )!
    );
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const mapped = products.map((p) => ({
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
  }));

  res.json(ListProductsResponse.parse(mapped));
});

function buildMatchPairs(products: (typeof productsTable.$inferSelect)[]) {
  const grouped = new Map<number, (typeof productsTable.$inferSelect)[]>();
  for (const p of products) {
    const group = grouped.get(p.matchId) || [];
    group.push(p);
    grouped.set(p.matchId, group);
  }

  const matches = [];
  for (const [matchId, group] of grouped) {
    const luxury = group.find((p) => p.type === "Luxury");
    const dupe = group.find((p) => p.type === "Dupe");
    if (!luxury || !dupe) continue;

    const priceDiff = luxury.price - dupe.price;
    const savingsPercent = (priceDiff / luxury.price) * 100;

    matches.push({
      matchId,
      category: luxury.category,
      luxury: {
        id: luxury.id,
        name: luxury.name,
        brand: luxury.brand,
        price: luxury.price,
        imageUrl: luxury.imageUrl,
        affiliateLink: luxury.affiliateLink,
        category: luxury.category,
        type: luxury.type,
        matchId: luxury.matchId,
        matchScore: luxury.matchScore,
      },
      dupe: {
        id: dupe.id,
        name: dupe.name,
        brand: dupe.brand,
        price: dupe.price,
        imageUrl: dupe.imageUrl,
        affiliateLink: dupe.affiliateLink,
        category: dupe.category,
        type: dupe.type,
        matchId: dupe.matchId,
        matchScore: dupe.matchScore,
      },
      matchScore: luxury.matchScore,
      priceDifference: Math.round(priceDiff * 100) / 100,
      savingsPercent: Math.round(savingsPercent),
    });
  }
  return matches;
}

router.get("/matches", async (req, res): Promise<void> => {
  const params = ListMatchesQueryParams.safeParse(req.query);
  const conditions = [];

  if (params.success && params.data.category) {
    conditions.push(eq(productsTable.category, params.data.category));
  }
  if (params.success && params.data.search) {
    const term = `%${params.data.search}%`;
    conditions.push(
      or(
        ilike(productsTable.name, term),
        ilike(productsTable.brand, term)
      )!
    );
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const matches = buildMatchPairs(products);
  res.json(ListMatchesResponse.parse(matches));
});

router.get("/matches/:matchId", async (req, res): Promise<void> => {
  const params = GetMatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.matchId, params.data.matchId));

  const matches = buildMatchPairs(products);
  if (matches.length === 0) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  res.json(GetMatchResponse.parse(matches[0]));
});

router.get("/categories/summary", async (_req, res): Promise<void> => {
  const result = await db
    .select({
      category: productsTable.category,
      count: sql<number>`count(distinct ${productsTable.matchId})::int`,
    })
    .from(productsTable)
    .groupBy(productsTable.category);

  res.json(GetCategorySummaryResponse.parse(result));
});

router.get("/trending", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .orderBy(productsTable.matchScore);

  const matches = buildMatchPairs(products);
  res.json(GetTrendingResponse.parse(matches));
});

export default router;
