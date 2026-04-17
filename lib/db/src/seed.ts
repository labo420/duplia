import { sql } from "drizzle-orm";
import { db } from "./index";
import { productsTable } from "./schema";
import { SEED_PRODUCTS } from "./seed-data";

const BATCH_SIZE = 20;

export async function runAutoSeed(): Promise<void> {
  let isEmpty = false;

  try {
    const result = await db.execute(sql`SELECT count(*)::int AS c FROM products`);
    const count = (result.rows[0] as { c: number }).c;
    isEmpty = count === 0;
  } catch {
    // Table doesn't exist yet — schema push hasn't run or failed silently
    isEmpty = true;
  }

  if (!isEmpty) {
    console.log("[seed] Database already populated — skipping seed.");
    return;
  }

  console.log(`[seed] Empty database detected — seeding ${SEED_PRODUCTS.length} products…`);

  for (let i = 0; i < SEED_PRODUCTS.length; i += BATCH_SIZE) {
    const batch = SEED_PRODUCTS.slice(i, i + BATCH_SIZE);
    await db.insert(productsTable).values(batch);
  }

  console.log(`[seed] Done — inserted ${SEED_PRODUCTS.length} products.`);
}
