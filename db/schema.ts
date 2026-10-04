import { pgTable, text, uuid, timestamp, json } from "drizzle-orm/pg-core";

export const csvUploads = pgTable("csv_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  fileName: text("file_name").notNull(),
  headers: json("headers").$type<string[]>().notNull(),
  data: json("data").$type<Record<string, string>[]>().notNull(),
  testColumn: text("test_column"),
  valueColumn: text("value_column"),
  unitColumn: text("unit_column"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
