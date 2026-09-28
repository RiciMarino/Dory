import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const slots = sqliteTable("slots", {
  id: text("id").primaryKey(),
  capacity: integer("capacity").notNull(),
  note: text("note").notNull().default(""),
});
export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  slotId: text("slot_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  people: integer("people").notNull(),
  message: text("message").notNull().default(""),
  sailDate: text("sail_date"),
  status: text("status").notNull().default("pending"),
  addedBy: text("added_by").notNull().default("guest"),
  createdAt: text("created_at").notNull(),
  confirmationSentAt: text("confirmation_sent_at"),
  confirmationSentTo: text("confirmation_sent_to"),
  cancellationSentAt: text("cancellation_sent_at"),
});
