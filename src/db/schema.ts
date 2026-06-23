import {
  bigint,
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const toolEnum = pgEnum("tool", ["codex", "claude-code"]);
export const tokenStatusEnum = pgEnum("token_status", ["active", "revoked"]);
export const anomalyStatusEnum = pgEnum("anomaly_status", ["open", "resolved"]);

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    xId: text("x_id"),
    xHandle: text("x_handle"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    profilePublic: boolean("profile_public").notNull().default(true),
    rankingEnabled: boolean("ranking_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_x_id_idx").on(table.xId),
    uniqueIndex("users_x_handle_idx").on(table.xHandle),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
    oauth_token_secret: text("oauth_token_secret"),
    oauth_token: text("oauth_token"),
  },
  (table) => [
    primaryKey({
      name: "accounts_provider_provider_account_id_pk",
      columns: [table.provider, table.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "verification_tokens_identifier_token_pk",
      columns: [table.identifier, table.token],
    }),
  ],
);

export const webhookTokens = pgTable(
  "webhook_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    label: text("label").notNull().default("default"),
    status: tokenStatusEnum("status").notNull().default("active"),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("webhook_tokens_hash_idx").on(table.tokenHash),
    index("webhook_tokens_user_idx").on(table.userId),
  ],
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceHash: text("device_hash").notNull(),
    label: text("label").notNull().default("Local device"),
    firstSeenAt: timestamp("first_seen_at", { mode: "date" }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { mode: "date" }).notNull().defaultNow(),
    blocked: boolean("blocked").notNull().default(false),
  },
  (table) => [
    uniqueIndex("devices_user_device_idx").on(table.userId, table.deviceHash),
    index("devices_user_idx").on(table.userId),
  ],
);

export const dailyUsage = pgTable(
  "daily_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    usageDate: date("usage_date", { mode: "string" }).notNull(),
    tool: toolEnum("tool").notNull(),
    model: text("model").notNull(),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).notNull().default(0),
    cacheWriteTokens: bigint("cache_write_tokens", { mode: "number" }).notNull().default(0),
    totalTokens: bigint("total_tokens", { mode: "number" }).notNull().default(0),
    estimatedCostMicros: bigint("estimated_cost_micros", { mode: "number" }).notNull().default(0),
    blocked: boolean("blocked").notNull().default(false),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("daily_usage_unique_idx").on(
      table.userId,
      table.deviceId,
      table.usageDate,
      table.tool,
      table.model,
    ),
    index("daily_usage_user_date_idx").on(table.userId, table.usageDate),
    index("daily_usage_date_idx").on(table.usageDate),
  ],
);

export const anomalyFlags = pgTable("anomaly_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dailyUsageId: uuid("daily_usage_id").references(() => dailyUsage.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: anomalyStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
});
