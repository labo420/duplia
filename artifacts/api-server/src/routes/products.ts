import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, and, ilike, or, sql, isNull, isNotNull, type SQL } from "drizzle-orm";
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
  ListLuxuryProductsQueryParams,
  ListLuxuryProductsResponse,
  ListSimilarLuxuryProductsQueryParams,
  ListSimilarLuxuryProductsResponse,
  GetStatsResponse,
  AdminListProductsResponse,
  AdminCreateProductBody,
  AdminDeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const pwd = req.headers["x-admin-password"];
  if (pwd !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

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

router.get("/products", async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  const conditions: SQL[] = [isNull(productsTable.luxuryGroupId)];

  if (params.success && params.data.category) {
    conditions.push(eq(productsTable.category, params.data.category));
  }
  if (params.success && params.data.search) {
    const term = `%${params.data.search}%`;
    const nameOrBrand = or(ilike(productsTable.name, term), ilike(productsTable.brand, term));
    if (nameOrBrand) conditions.push(nameOrBrand);
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(and(...conditions));

  res.json(ListProductsResponse.parse(products.map(mapProduct)));
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
      luxury: mapProduct(luxury),
      dupe: mapProduct(dupe),
      matchScore: luxury.matchScore,
      priceDifference: Math.round(priceDiff * 100) / 100,
      savingsPercent: Math.round(savingsPercent),
    });
  }
  return matches;
}

router.get("/matches", async (req, res): Promise<void> => {
  const params = ListMatchesQueryParams.safeParse(req.query);
  const conditions: SQL[] = [isNull(productsTable.luxuryGroupId)];

  if (params.success && params.data.category) {
    conditions.push(eq(productsTable.category, params.data.category));
  }
  if (params.success && params.data.search) {
    const term = `%${params.data.search}%`;
    const nameOrBrand = or(ilike(productsTable.name, term), ilike(productsTable.brand, term));
    if (nameOrBrand) conditions.push(nameOrBrand);
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(and(...conditions));

  res.json(ListMatchesResponse.parse(buildMatchPairs(products)));
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

  const luxury = products.find((p) => p.type === "Luxury");
  const dupe = products.find((p) => p.type === "Dupe");

  if (luxury && dupe) {
    const matches = buildMatchPairs(products);
    if (matches.length === 0) {
      res.status(404).json({ error: "Match not found" });
      return;
    }
    res.json(GetMatchResponse.parse(matches[0]));
    return;
  }

  if (dupe?.luxuryGroupId) {
    const [groupLuxury] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.luxuryGroupId, dupe.luxuryGroupId),
          eq(productsTable.type, "Luxury")
        )
      )
      .limit(1);

    if (groupLuxury) {
      const priceDiff = groupLuxury.price - dupe.price;
      const savingsPercent = (priceDiff / groupLuxury.price) * 100;
      res.json(
        GetMatchResponse.parse({
          matchId: params.data.matchId,
          category: groupLuxury.category,
          luxury: mapProduct(groupLuxury),
          dupe: mapProduct(dupe),
          matchScore: dupe.matchScore,
          priceDifference: Math.round(priceDiff * 100) / 100,
          savingsPercent: Math.round(savingsPercent),
        })
      );
      return;
    }
  }

  res.status(404).json({ error: "Match not found" });
});

router.get("/categories/summary", async (_req, res): Promise<void> => {
  const result = await db
    .select({
      category: productsTable.category,
      count: sql<number>`count(distinct ${productsTable.matchId})::int`,
    })
    .from(productsTable)
    .where(isNull(productsTable.luxuryGroupId))
    .groupBy(productsTable.category);

  res.json(GetCategorySummaryResponse.parse(result));
});

router.get("/products/luxury", async (req, res): Promise<void> => {
  const params = ListLuxuryProductsQueryParams.safeParse(req.query);

  const conditions: SQL[] = [eq(productsTable.type, "Luxury")];
  if (params.success && params.data.category) {
    conditions.push(eq(productsTable.category, params.data.category));
  }

  const rows = await db
    .select({
      id: productsTable.id,
      brand: productsTable.brand,
      name: productsTable.name,
      category: productsTable.category,
      imageUrl: productsTable.imageUrl,
      price: productsTable.price,
      luxuryGroupId: productsTable.luxuryGroupId,
    })
    .from(productsTable)
    .where(and(...conditions))
    .orderBy(productsTable.brand, productsTable.name);

  // Deduplicate by brand+name (keep the one that's already analyzed if present)
  const map = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    const key = `${r.brand}|${r.name}`;
    const existing = map.get(key);
    if (!existing || (r.luxuryGroupId !== null && existing.luxuryGroupId === null)) {
      map.set(key, r);
    }
  }

  const out = Array.from(map.values()).map((r) => ({
    id: r.id,
    brand: r.brand,
    name: r.name,
    category: r.category,
    imageUrl: r.imageUrl,
    price: r.price > 0 ? r.price : null,
    isAnalyzed: r.luxuryGroupId !== null,
  }));

  res.json(ListLuxuryProductsResponse.parse(out));
});

router.get("/products/similar", async (req, res): Promise<void> => {
  const params = ListSimilarLuxuryProductsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const q = params.data.q.trim();
  const limit = params.data.limit ?? 5;

  // Normalize: lowercase + strip diacritics + remove punctuation
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const tokens = normalize(q)
    .split(" ")
    .filter((t: string) => t.length >= 2);

  // Helper: fetch top N popular analyzed luxury products as a universal fallback
  async function fetchPopularLuxuryFallback(
    n: number
  ): Promise<typeof rows> {
    return db
      .select({
        id: productsTable.id,
        brand: productsTable.brand,
        name: productsTable.name,
        category: productsTable.category,
        imageUrl: productsTable.imageUrl,
        price: productsTable.price,
        luxuryGroupId: productsTable.luxuryGroupId,
        isBestGuess: productsTable.isBestGuess,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.type, "Luxury"),
          isNotNull(productsTable.luxuryGroupId),
          eq(productsTable.isBestGuess, false)
        )
      )
      .orderBy(productsTable.brand)
      .limit(n);
  }

  let rows: {
    id: number;
    brand: string;
    name: string;
    category: string;
    imageUrl: string;
    price: number;
    luxuryGroupId: number | null;
    isBestGuess: boolean;
  }[] = [];

  if (tokens.length > 0) {
    // Build OR of ilike patterns on normalized combined brand+name for each token
    const tokenConditions = tokens.map((t: string) =>
      ilike(sql`lower(${productsTable.brand} || ' ' || ${productsTable.name})`, `%${t}%`)
    );
    const fuzzyMatch = or(...tokenConditions);

    const conditions: SQL[] = [eq(productsTable.type, "Luxury")];
    if (fuzzyMatch) conditions.push(fuzzyMatch);

    rows = await db
      .select({
        id: productsTable.id,
        brand: productsTable.brand,
        name: productsTable.name,
        category: productsTable.category,
        imageUrl: productsTable.imageUrl,
        price: productsTable.price,
        luxuryGroupId: productsTable.luxuryGroupId,
        isBestGuess: productsTable.isBestGuess,
      })
      .from(productsTable)
      .where(and(...conditions))
      .limit(50);
  }

  // Top-up fallback: ensure we always reach `limit` items by appending popular
  // analyzed luxuries that aren't already present (dedupe happens below).
  if (rows.length < limit) {
    const fillers = await fetchPopularLuxuryFallback(limit * 3);
    rows = rows.concat(fillers);
  }

  // Dedupe by brand|name (prefer the analyzed, non-best-guess entry)
  const map = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    const key = `${r.brand.toLowerCase()}|${r.name.toLowerCase()}`;
    const existing = map.get(key);
    const rIsAnalyzed = r.luxuryGroupId !== null;
    const eIsAnalyzed = existing ? existing.luxuryGroupId !== null : false;
    if (
      !existing ||
      // Prefer analyzed over not analyzed
      (rIsAnalyzed && !eIsAnalyzed) ||
      // Among analyzed, prefer non-best-guess
      (rIsAnalyzed && eIsAnalyzed && !r.isBestGuess && existing.isBestGuess)
    ) {
      map.set(key, r);
    }
  }

  // Rank: count matched tokens in normalized (brand + ' ' + name)
  const ranked = Array.from(map.values())
    .map((r) => {
      const text = normalize(`${r.brand} ${r.name}`);
      const score = tokens.reduce(
        (acc: number, t: string) => (text.includes(t) ? acc + 1 : acc),
        0
      );
      return { r, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Prefer analyzed
      const aAna = a.r.luxuryGroupId !== null ? 1 : 0;
      const bAna = b.r.luxuryGroupId !== null ? 1 : 0;
      if (aAna !== bAna) return bAna - aAna;
      return a.r.brand.localeCompare(b.r.brand);
    })
    .slice(0, limit)
    .map(({ r }) => ({
      id: r.id,
      brand: r.brand,
      name: r.name,
      category: r.category,
      imageUrl: r.imageUrl,
      price: r.price > 0 ? r.price : null,
      isAnalyzed: r.luxuryGroupId !== null,
    }));

  res.json(ListSimilarLuxuryProductsResponse.parse(ranked));
});

router.get("/stats", async (_req, res): Promise<void> => {
  const luxuryCountRow = await db
    .select({ c: sql<number>`count(distinct (${productsTable.brand} || '|' || ${productsTable.name}))::int` })
    .from(productsTable)
    .where(eq(productsTable.type, "Luxury"));

  const analyzedCountRow = await db
    .select({ c: sql<number>`count(distinct ${productsTable.luxuryGroupId})::int` })
    .from(productsTable)
    .where(and(eq(productsTable.type, "Luxury"), isNotNull(productsTable.luxuryGroupId)));

  // Avg savings: per group, savings = (luxuryPrice - minDupePrice) / luxuryPrice * 100
  const groups = await db
    .select({
      luxuryGroupId: productsTable.luxuryGroupId,
      type: productsTable.type,
      price: productsTable.price,
    })
    .from(productsTable)
    .where(isNotNull(productsTable.luxuryGroupId));

  const byGroup = new Map<number, { luxury: number | null; minDupe: number | null }>();
  for (const r of groups) {
    if (r.luxuryGroupId === null) continue;
    const g = byGroup.get(r.luxuryGroupId) ?? { luxury: null, minDupe: null };
    if (r.type === "Luxury" && r.price > 0) g.luxury = r.price;
    if (r.type === "Dupe" && r.price > 0) {
      g.minDupe = g.minDupe === null ? r.price : Math.min(g.minDupe, r.price);
    }
    byGroup.set(r.luxuryGroupId, g);
  }

  const savings: number[] = [];
  for (const g of byGroup.values()) {
    if (g.luxury && g.minDupe && g.luxury > 0) {
      savings.push(((g.luxury - g.minDupe) / g.luxury) * 100);
    }
  }
  const avgSavings = savings.length > 0
    ? Math.round(savings.reduce((a, b) => a + b, 0) / savings.length)
    : 0;

  res.json(GetStatsResponse.parse({
    luxuryProductsCount: luxuryCountRow[0]?.c ?? 0,
    analyzedCount: analyzedCountRow[0]?.c ?? 0,
    avgSavingsPercent: avgSavings,
  }));
});

router.get("/trending", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(isNull(productsTable.luxuryGroupId))
    .orderBy(productsTable.matchScore);
  res.json(GetTrendingResponse.parse(buildMatchPairs(products)));
});

// Admin routes
router.get("/admin/products", requireAdmin, async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.id);
  res.json(AdminListProductsResponse.parse(products.map(mapProduct)));
});

router.post("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      name: parsed.data.name,
      brand: parsed.data.brand,
      price: parsed.data.price,
      imageUrl: parsed.data.imageUrl,
      affiliateLink: parsed.data.affiliateLink,
      category: parsed.data.category,
      type: parsed.data.type,
      matchId: parsed.data.matchId,
      matchScore: parsed.data.matchScore ?? 90,
      formato: parsed.data.formato ?? null,
      unitaMisura: parsed.data.unitaMisura ?? null,
    })
    .returning();

  res.status(201).json(mapProduct(product));
});

router.delete("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminDeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
