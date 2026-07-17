import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
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

export const toolEnum = pgEnum("tool", [
  "codex",
  "claude-code",
  "hermes",
  "openclaw",
  "cline",
  "opencode",
  "workbuddy",
  "gemini",
  "zcode",
  "kimi",
  "kilo-code",
  "codex-vps",
  "roo-code",
  "qwen",
  "codex-cache",
  "cursor",
  "github-copilot",
  "continue",
]);
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
    uniqueIndex("users_email_idx").on(table.email),
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
    accountingVersion: integer("accounting_version").notNull().default(1),
    cutoverDate: date("cutover_date", { mode: "string" }),
    snapshotRevision: integer("snapshot_revision").notNull().default(0),
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
    accountingVersion: integer("accounting_version").notNull().default(1),
    snapshotId: text("snapshot_id"),
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
    uniqueIndex("daily_usage_accounting_unique_idx").on(
      table.userId,
      table.deviceId,
      table.usageDate,
      table.tool,
      table.model,
      table.accountingVersion,
    ),
    index("daily_usage_user_date_idx").on(table.userId, table.usageDate),
    index("daily_usage_date_idx").on(table.usageDate),
    check("daily_usage_input_tokens_nonnegative", sql`${table.inputTokens} >= 0`),
    check("daily_usage_output_tokens_nonnegative", sql`${table.outputTokens} >= 0`),
    check("daily_usage_cache_read_tokens_nonnegative", sql`${table.cacheReadTokens} >= 0`),
    check("daily_usage_cache_write_tokens_nonnegative", sql`${table.cacheWriteTokens} >= 0`),
    check("daily_usage_total_tokens_nonnegative", sql`${table.totalTokens} >= 0`),
    check(
      "daily_usage_estimated_cost_micros_nonnegative",
      sql`${table.estimatedCostMicros} >= 0`,
    ),
  ],
);

export const usageSnapshots = pgTable(
  "usage_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    snapshotId: text("snapshot_id").notNull(),
    revision: integer("revision").notNull(),
    batchCount: integer("batch_count").notNull(),
    cutoverDate: date("cutover_date", { mode: "string" }).notNull(),
    status: text("status", { enum: ["receiving", "committed"] })
      .notNull()
      .default("receiving"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    committedAt: timestamp("committed_at", { mode: "date" }),
  },
  (table) => [
    uniqueIndex("usage_snapshots_device_snapshot_idx").on(
      table.userId,
      table.deviceId,
      table.snapshotId,
    ),
    uniqueIndex("usage_snapshots_one_receiving_idx")
      .on(table.userId, table.deviceId)
      .where(sql`${table.status} = 'receiving'`),
    index("usage_snapshots_status_idx").on(table.status),
    check("usage_snapshots_batch_count_positive", sql`${table.batchCount} > 0`),
    check("usage_snapshots_revision_positive", sql`${table.revision} > 0`),
    check(
      "usage_snapshots_status_valid",
      sql`${table.status} in ('receiving', 'committed')`,
    ),
  ],
);

export const usageSnapshotBatches = pgTable(
  "usage_snapshot_batches",
  {
    snapshotRowId: uuid("snapshot_row_id")
      .notNull()
      .references(() => usageSnapshots.id, { onDelete: "cascade" }),
    batchIndex: integer("batch_index").notNull(),
    batchHash: text("batch_hash").notNull(),
    rowCount: integer("row_count").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.snapshotRowId, table.batchIndex] }),
    check("usage_snapshot_batches_index_nonnegative", sql`${table.batchIndex} >= 0`),
    check("usage_snapshot_batches_row_count_nonnegative", sql`${table.rowCount} >= 0`),
  ],
);

export const usageSnapshotRows = pgTable(
  "usage_snapshot_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotRowId: uuid("snapshot_row_id")
      .notNull()
      .references(() => usageSnapshots.id, { onDelete: "cascade" }),
    batchIndex: integer("batch_index").notNull(),
    usageDate: date("usage_date", { mode: "string" }).notNull(),
    tool: toolEnum("tool").notNull(),
    model: text("model").notNull(),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).notNull().default(0),
    cacheWriteTokens: bigint("cache_write_tokens", { mode: "number" }).notNull().default(0),
    totalTokens: bigint("total_tokens", { mode: "number" }).notNull().default(0),
    estimatedCostMicros: bigint("estimated_cost_micros", { mode: "number" }).notNull().default(0),
  },
  (table) => [
    uniqueIndex("usage_snapshot_rows_unique_idx").on(
      table.snapshotRowId,
      table.usageDate,
      table.tool,
      table.model,
    ),
    check("usage_snapshot_rows_batch_index_nonnegative", sql`${table.batchIndex} >= 0`),
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
