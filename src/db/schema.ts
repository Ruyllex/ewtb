import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, boolean, decimal, customType } from "drizzle-orm/pg-core";

import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

// Tipo personalizado para BYTEA (binary data) en PostgreSQL
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
  toDriver: (value) => value,
  fromDriver: (value) => value as Buffer,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").unique().notNull(),
    name: text("name").notNull(),
    // Todo: add banner fields
    imageUrl: text("image_url").notNull(),
    // Campos de monetización
    stripeAccountId: text("stripe_account_id").unique(), // ID de la cuenta de Stripe Connect
    stripeAccountStatus: text("stripe_account_status"), // pending, active, restricted, etc.
    canMonetize: boolean("can_monetize").default(false).notNull(), // Flag para habilitar monetización
    dateOfBirth: timestamp("date_of_birth"), // Para verificar edad mínima
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("clerk_id_idx").on(t.clerkId)]
);

export const userRelations = relations(users, ({ many, one }) => ({
  videos: many(videos),
  transactions: many(transactions),
  balance: one(balances),
  payouts: many(payouts),
}));

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("name_idx").on(t.name)]
);

export const categoryRelations = relations(categories, ({ many }) => ({
  videos: many(videos),
}));

export const videoVisibility = pgEnum("video_visibility", ["public", "private"]);

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  muxStatus: text("mux_status"),
  muxAssetId: text("mux_asset_id").unique(),
  muxUploadId: text("mux_upload_id").unique(),
  muxPlaybackId: text("mux_playback_id").unique(),
  muxTrackId: text("mux_track_id").unique(),
  muxTrackStatus: text("mux_track_status"),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailKey: text("thumbnail_key"),
  thumbnailImage: bytea("thumbnail_image"), // Imagen del thumbnail almacenada en la BD
  previewUrl: text("preview_url"),
  previewKey: text("preview_key"),
  duration: integer("duration").default(0).notNull(),
  visibility: videoVisibility("visibility").notNull().default("private"),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videoInsertSchema = createInsertSchema(videos);
export const videoUpdateSchema = createUpdateSchema(videos);
export const videoSelectSchema = createSelectSchema(videos);

export const videoRelations = relations(videos, ({ one, many }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [videos.categoryId],
    references: [categories.id],
  }),
  views: many(views),
}));

export const views = pgTable("views", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id")
    .references(() => videos.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const viewRelations = relations(views, ({ one }) => ({
  video: one(videos, {
    fields: [views.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [views.userId],
    references: [users.id],
  }),
}));

export const liveStreams = pgTable("live_streams", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  streamKey: text("stream_key").unique().notNull(),
  playbackId: text("playback_id").unique(),
  status: text("status").default("idle").notNull(), // idle, active, disconnected
  muxLiveStreamId: text("mux_live_stream_id").unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const liveStreamRelations = relations(liveStreams, ({ one }) => ({
  user: one(users, {
    fields: [liveStreams.userId],
    references: [users.id],
  }),
}));

// Enum para tipos de transacciones
export const transactionType = pgEnum("transaction_type", ["tip", "subscription", "payout"]);

// Enum para estados de transacciones
export const transactionStatus = pgEnum("transaction_status", ["pending", "completed", "failed", "refunded"]);

// Tabla de transacciones
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // Creador que recibe el pago
  payerId: uuid("payer_id").references(() => users.id, { onDelete: "set null" }), // Usuario que hace el pago (puede ser null si es externo)
  videoId: uuid("video_id").references(() => videos.id, { onDelete: "set null" }), // Video relacionado (para tips)
  type: transactionType("type").notNull(),
  status: transactionStatus("status").default("pending").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Monto en centavos
  currency: text("currency").default("usd").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(), // ID del PaymentIntent de Stripe
  stripeChargeId: text("stripe_charge_id"), // ID del cargo de Stripe
  stripeSubscriptionId: text("stripe_subscription_id"), // ID de la suscripción (si aplica)
  description: text("description"), // Descripción de la transacción
  metadata: text("metadata"), // JSON con metadata adicional
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabla de balances (saldo acumulado por creador)
export const balances = pgTable("balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(), // Un balance por usuario
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0").notNull(), // Saldo disponible para retiro
  pendingBalance: decimal("pending_balance", { precision: 10, scale: 2 }).default("0").notNull(), // Saldo pendiente (en proceso)
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0").notNull(), // Total ganado históricamente
  currency: text("currency").default("usd").notNull(),
  lastPayoutAt: timestamp("last_payout_at"), // Última fecha de retiro
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabla de retiros (payouts)
export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Monto a retirar
  currency: text("currency").default("usd").notNull(),
  status: transactionStatus("status").default("pending").notNull(),
  stripePayoutId: text("stripe_payout_id").unique(), // ID del payout de Stripe
  stripeTransferId: text("stripe_transfer_id"), // ID del transfer de Stripe
  failureReason: text("failure_reason"), // Razón del fallo si aplica
  processedAt: timestamp("processed_at"), // Fecha de procesamiento
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relaciones
export const transactionRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  payer: one(users, {
    fields: [transactions.payerId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [transactions.videoId],
    references: [videos.id],
  }),
}));

export const balanceRelations = relations(balances, ({ one }) => ({
  user: one(users, {
    fields: [balances.userId],
    references: [users.id],
  }),
}));

export const payoutRelations = relations(payouts, ({ one }) => ({
  user: one(users, {
    fields: [payouts.userId],
    references: [users.id],
  }),
}));
