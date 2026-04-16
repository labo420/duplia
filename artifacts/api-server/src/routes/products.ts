import { Router, type IRouter } from "express";
import { eq, and, ilike, or, sql, isNull, type SQL } from "drizzle-orm";
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
  AdminListProductsResponse,
  AdminCreateProductBody,
  AdminDeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function requireAdmin(req: Parameters<Parameters<typeof router.use>[0]>[0], res: Parameters<Parameters<typeof router.use>[0]>[1], next: Parameters<Parameters<typeof router.use>[0]>[2]) {
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
