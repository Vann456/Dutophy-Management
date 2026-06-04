import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description"),
  amount: integer("amount"),
  createdAt: timestamp("created_at").defaultNow(),
});
