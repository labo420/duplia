import { pgTable, text, serial, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
