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
    username: text("username").unique(), // Username único para URLs de canales
    // Todo: add banner fields
    imageUrl: text("image_url").notNull(),
    // Campos de monetización
    paypalAccountId: text("paypal_account_id").unique(), // ID de la cuenta de PayPal
    paypalAccountStatus: text("paypal_account_status"), // pending, active, restricted, etc.
    canMonetize: boolean("can_monetize").default(false).notNull(), // Flag para habilitar monetización
    dateOfBirth: timestamp("date_of_birth"), // Para verificar edad mínima
    isAdmin: boolean("is_admin").default(false).notNull(), // Flag para identificar administradores
    // Moneda interna: Stars
    starsBalance: decimal("stars_balance", { precision: 10, scale: 2 }).default("0").notNull(), // Saldo de Stars del usuario
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("clerk_id_idx").on(t.clerkId),
    uniqueIndex("username_idx").on(t.username),
  ]
);

export const userRelations = relations(users, ({ many, one }) => ({
  videos: many(videos),
  transactions: many(transactions),
  balance: one(balances),
  payouts: many(payouts),
  monetizationRequests: many(monetizationRequests),
  reviewedPayouts: many(payouts, {
    relationName: "payoutReviewer",
  }),
  reviewedMonetizationRequests: many(monetizationRequests, {
    relationName: "monetizationRequestReviewer",
  }),
  notifications: many(notifications),
  relatedNotifications: many(notifications, {
    relationName: "notificationRelatedUser",
  }),
  channel: one(channels, {
    fields: [users.id],
    references: [channels.userId],
  }),
  subscriptions: many(subscriptions, {
    relationName: "subscriber",
  }),
  channelSubscriptions: many(subscriptions, {
    relationName: "channel",
  }),
  liveStreams: many(liveStreams),
  comments: many(comments),
  reports: many(reports),
  reviewedReports: many(reports, {
    relationName: "reviewer",
  }),
  userActions: many(userActions),
  createdUserActions: many(userActions, {
    relationName: "actionCreator",
  }),
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

export const videoVisibility = pgEnum("video_visibility", ["public", "private", "restricted", "hidden"]);
export const reportStatus = pgEnum("report_status", ["pending", "valid", "invalid", "resolved"]);
export const reportAction = pgEnum("report_action", [
  "no_action",
  "video_hidden",
  "video_deleted",
  "video_restricted",
  "user_warned",
  "user_suspended",
  "user_banned",
  "reporter_penalized",
]);
export const userActionType = pgEnum("user_action_type", ["warning", "suspension", "ban"]);

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
  likes: integer("likes").default(0).notNull(),
});

export const videoLikes = pgTable(
  "video_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .references(() => videos.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("video_user_like_idx").on(t.videoId, t.userId),
  ]
);
export const videoLikeRelations = relations(videoLikes, ({ one }) => ({
  video: one(videos, {
    fields: [videoLikes.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [videoLikes.userId],
    references: [users.id],
  }),
}));


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
  comments: many(comments),
  reports: many(reports),
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

// Tabla de comentarios
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id")
    .references(() => videos.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  texto: text("texto").notNull(),
  fecha: timestamp("fecha").defaultNow().notNull(),
  parentId: uuid("parent_id"), // ID del comentario padre (si es una respuesta) - referencia manual para evitar circular
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commentInsertSchema = createInsertSchema(comments);
export const commentSelectSchema = createSelectSchema(comments);
export const commentUpdateSchema = createUpdateSchema(comments);

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
export const transactionType = pgEnum("transaction_type", ["tip", "subscription", "payout", "stars_tip", "stars_purchase"]);

// Enum para estados de transacciones
export const transactionStatus = pgEnum("transaction_status", ["pending", "completed", "failed", "refunded", "processing"]);

// Enum para estados de solicitudes de monetización
export const monetizationRequestStatus = pgEnum("monetization_request_status", ["pending", "approved", "rejected"]);

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
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Monto en dólares o equivalente en USD
  starsAmount: decimal("stars_amount", { precision: 10, scale: 2 }), // Cantidad de Stars (para tips con stars o compras)
  currency: text("currency").default("usd").notNull(),
  paypalOrderId: text("paypal_order_id").unique(), // ID de la orden de PayPal
  paypalCaptureId: text("paypal_capture_id"), // ID de la captura de PayPal
  paypalSubscriptionId: text("paypal_subscription_id"), // ID de la suscripción de PayPal (si aplica)
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

// Tabla de solicitudes de monetización
export const monetizationRequests = pgTable("monetization_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  paypalEmail: text("paypal_email").notNull(), // Email de PayPal del usuario
  termsAccepted: boolean("terms_accepted").default(false).notNull(), // Aceptación de términos
  status: monetizationRequestStatus("status").default("pending").notNull(), // Estado de la solicitud
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }), // Admin que revisó
  reviewedAt: timestamp("reviewed_at"), // Fecha de revisión
  rejectionReason: text("rejection_reason"), // Razón del rechazo si aplica
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabla de retiros (payouts)
export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Monto solicitado a retirar
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default("0").notNull(), // Comisión de la plataforma (3%)
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(), // Monto neto a pagar (amount - platformFee)
  currency: text("currency").default("usd").notNull(),
  status: transactionStatus("status").default("pending").notNull(),
  paypalPayoutId: text("paypal_payout_id").unique(), // ID del payout de PayPal
  paypalTransferId: text("paypal_transfer_id"), // ID del transfer de PayPal
  failureReason: text("failure_reason"), // Razón del fallo si aplica
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }), // Admin que revisó
  reviewedAt: timestamp("reviewed_at"), // Fecha de revisión
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
  reviewer: one(users, {
    fields: [payouts.reviewedBy],
    references: [users.id],
    relationName: "payoutReviewer",
  }),
}));

export const monetizationRequestRelations = relations(monetizationRequests, ({ one }) => ({
  user: one(users, {
    fields: [monetizationRequests.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [monetizationRequests.reviewedBy],
    references: [users.id],
    relationName: "monetizationRequestReviewer",
  }),
}));

// Tabla de canales
export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(), // Un canal por usuario
  name: text("name").notNull(),
  description: text("description"),
  avatar: text("avatar"), // URL del avatar del canal
  avatarKey: text("avatar_key"), // Key de UploadThing para el avatar
  banner: text("banner"), // URL del banner del canal
  bannerKey: text("banner_key"), // Key de UploadThing para el banner
  isVerified: boolean("is_verified").default(false).notNull(), // Canal verificado por admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const channelRelations = relations(channels, ({ one, many }) => ({
  user: one(users, {
    fields: [channels.userId],
    references: [users.id],
  }),
  subscriptions: many(subscriptions),
}));

// Tabla de suscripciones a canales (followers)
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriberId: uuid("subscriber_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // Usuario que se suscribe
    channelId: uuid("channel_id")
      .references(() => channels.id, { onDelete: "cascade" })
      .notNull(), // Canal al que se suscribe
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("subscriber_channel_idx").on(t.subscriberId, t.channelId), // Un usuario solo puede suscribirse una vez a un canal
  ]
);

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  subscriber: one(users, {
    fields: [subscriptions.subscriberId],
    references: [users.id],
    relationName: "subscriber",
  }),
  channel: one(channels, {
    fields: [subscriptions.channelId],
    references: [channels.id],
    relationName: "channel",
  }),
}));

export const commentRelations = relations(comments, ({ one, many }) => ({
  video: one(videos, {
    fields: [comments.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, {
    relationName: "replies",
  }),
}));

// Tabla de reportes de videos
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id")
    .references(() => videos.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  reason: text("reason").notNull(),
  status: reportStatus("status").default("pending").notNull(),
  adminAction: reportAction("admin_action"),
  adminNotes: text("admin_notes"), // Notas internas del admin
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }), // Admin que revisó
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reportRelations = relations(reports, ({ one }) => ({
  video: one(videos, {
    fields: [reports.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [reports.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
}));

// Tabla de acciones sobre usuarios (warnings, suspensions, bans)
export const userActions = pgTable("user_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  actionType: userActionType("action_type").notNull(),
  reason: text("reason").notNull(),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }), // Reporte relacionado
  duration: integer("duration"), // Duración en días (null = permanente)
  expiresAt: timestamp("expires_at"), // Fecha de expiración (null = permanente)
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "set null" })
    .notNull(), // Admin que creó la acción
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userActionRelations = relations(userActions, ({ one }) => ({
  user: one(users, {
    fields: [userActions.userId],
    references: [users.id],
  }),
  report: one(reports, {
    fields: [userActions.reportId],
    references: [reports.id],
  }),
  creator: one(users, {
    fields: [userActions.createdBy],
    references: [users.id],
    relationName: "actionCreator",
  }),
}));

// Tabla de notificaciones
export const notificationType = pgEnum("notification_type", [
  "donation_received",
  "subscription_received",
  "payout_approved",
  "payout_rejected",
  "monetization_approved",
  "monetization_rejected",
  "new_follower",
  "video_liked",
  "comment_reply",
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // Usuario que recibe la notificación
  type: notificationType("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedUserId: uuid("related_user_id").references(() => users.id, { onDelete: "set null" }), // Usuario relacionado (ej: quien donó)
  relatedVideoId: uuid("related_video_id").references(() => videos.id, { onDelete: "set null" }), // Video relacionado si aplica
  relatedTransactionId: uuid("related_transaction_id").references(() => transactions.id, { onDelete: "set null" }), // Transacción relacionada si aplica
  read: boolean("read").default(false).notNull(),
  metadata: text("metadata"), // JSON con datos adicionales
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedUser: one(users, {
    fields: [notifications.relatedUserId],
    references: [users.id],
    relationName: "notificationRelatedUser",
  }),
  relatedVideo: one(videos, {
    fields: [notifications.relatedVideoId],
    references: [videos.id],
  }),
  relatedTransaction: one(transactions, {
    fields: [notifications.relatedTransactionId],
    references: [transactions.id],
  }),
}));
