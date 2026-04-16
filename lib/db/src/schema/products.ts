import { pgTable, text, serial, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const CATEGORIES = ["Skincare", "Makeup", "Haircare", "Bodycare", "Fragrance"] as const;
export type Category = (typeof CATEGORIES)[number];

export const DUPE_TIERS = ["budget", "mid-range", "premium-dupe"] as const;
export type DupeTier = (typeof DUPE_TIERS)[number];

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  price: real("price").notNull(),
  imageUrl: text("image_url").notNull(),
  affiliateLink: text("affiliate_link").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  matchId: integer("match_id").notNull(),
  matchScore: integer("match_score").notNull().default(90),
  formato: real("formato"),
  unitaMisura: text("unita_misura"),
  dupeTier: text("dupe_tier"),
  lastAiCheckedAt: timestamp("last_ai_checked_at"),
  luxuryGroupId: integer("luxury_group_id"),
  aiMatchReason: text("ai_match_reason"),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
