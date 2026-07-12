import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { dailyUsage, devices, users, webhookTokens } from "../db/schema";

import { estimateCostMicros } from "./pricing";
import { getRangeStart, rankUsageRows } from "./ranking/ranking";
import { hashSecret } from "./security/tokens";
import { canonicalTotalTokens } from "./token-metrics";
import type { BoardKey, RangeKey, TokenUsageEntry, UsageRow } from "./types";

type UserRow = typeof users.$inferSelect;
type PgBatchItem = BatchItem<"pg">;
const LEADERBOARD_LIMIT = 100;

export type PublicProfileUser = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  profilePublic: boolean;
  rankingEnabled: boolean;
};

export type UserSettingsInput = {
  profilePublic?: boolean;
  rankingEnabled?: boolean;
};

export type UserUploadStatus = {
  hasUsage: boolean;
  latestUploadedAt: string | null;
};

export type UploadResult =
  | { ok: true; status: 200; uploaded: number }
  | { ok: false; status: 401 };

async function getDb() {
  const { db } = await import("../db/client");
  return db;
}

function displayHandle(handle: string | null): string {
  return handle?.trim() || "unknown";
}

function displayName(name: string | null, handle: string | null): string {
  return name?.trim() || handle?.trim() || "Unknown";
}

function toUtcDateKey(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function sanitizePublicUser(user: UserRow): PublicProfileUser {
  return {
    id: user.id,
    handle: displayHandle(user.xHandle),
    name: displayName(user.displayName, user.xHandle),
    avatarUrl: user.avatarUrl,
    profilePublic: user.profilePublic,
    rankingEnabled: user.rankingEnabled,
  };
}

export async function getUserSettings(userId: string): Promise<PublicProfileUser | null> {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return user ? sanitizePublicUser(user) : null;
}

export async function getUserUploadStatus(userId: string): Promise<UserUploadStatus> {
  const db = await getDb();
  const [row] = await db
    .select({
      latestUploadedAt: sql<Date | string | null>`max(${dailyUsage.updatedAt})`,
    })
    .from(dailyUsage)
    .innerJoin(devices, eq(devices.id, dailyUsage.deviceId))
    .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.blocked, false), eq(devices.blocked, false)));

  const latestUploadedAt = toIsoString(row?.latestUploadedAt);

  return {
    hasUsage: Boolean(latestUploadedAt),
    latestUploadedAt,
  };
}

export async function getUserDashboard(userId: string) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    return null;
  }

  const rows = await db
    .select({
      id: dailyUsage.id,
      usageDate: dailyUsage.usageDate,
      tool: dailyUsage.tool,
      model: dailyUsage.model,
      inputTokens: dailyUsage.inputTokens,
      outputTokens: dailyUsage.outputTokens,
      cacheReadTokens: dailyUsage.cacheReadTokens,
      cacheWriteTokens: dailyUsage.cacheWriteTokens,
      totalTokens: dailyUsage.totalTokens,
      estimatedCostMicros: dailyUsage.estimatedCostMicros,
      blocked: dailyUsage.blocked,
      updatedAt: dailyUsage.updatedAt,
      deviceId: devices.id,
      deviceLabel: devices.label,
    })
    .from(dailyUsage)
    .innerJoin(devices, eq(devices.id, dailyUsage.deviceId))
    .where(and(eq(dailyUsage.userId, user.id), eq(dailyUsage.blocked, false), eq(devices.blocked, false)))
    .orderBy(desc(dailyUsage.usageDate), desc(dailyUsage.updatedAt));

  return {
    user: sanitizePublicUser(user),
    daily: rows,
  };
}

export async function updateUserSettings(
  userId: string,
  input: UserSettingsInput,
): Promise<PublicProfileUser | null> {
  const db = await getDb();
  const [user] = await db
    .update(users)
    .set({
      ...input,
      updatedAt: sql`now()`,
    })
    .where(eq(users.id, userId))
    .returning();

  return user ? sanitizePublicUser(user) : null;
}

export async function getUsageRows(range: RangeKey): Promise<UsageRow[]> {
  const db = await getDb();
  const now = new Date();
  const start = getRangeStart(range, now);
  const end = toUtcDateKey(now);
  const rows = await db
    .select({
      userId: users.id,
      handle: users.xHandle,
      name: users.displayName,
      avatarUrl: users.avatarUrl,
      deviceId: devices.id,
      date: dailyUsage.usageDate,
      tool: dailyUsage.tool,
      model: dailyUsage.model,
      inputTokens: dailyUsage.inputTokens,
      outputTokens: dailyUsage.outputTokens,
      cacheReadTokens: dailyUsage.cacheReadTokens,
      cacheWriteTokens: dailyUsage.cacheWriteTokens,
      totalTokens: dailyUsage.totalTokens,
      estimatedCostMicros: dailyUsage.estimatedCostMicros,
      blocked: dailyUsage.blocked,
    })
    .from(dailyUsage)
    .innerJoin(users, eq(users.id, dailyUsage.userId))
    .innerJoin(devices, eq(devices.id, dailyUsage.deviceId))
    .where(
      and(
        eq(users.rankingEnabled, true),
        eq(devices.blocked, false),
        eq(dailyUsage.blocked, false),
        gte(dailyUsage.usageDate, start),
        lte(dailyUsage.usageDate, end),
      ),
    );

  return rows.map((row) => ({
    ...row,
    handle: displayHandle(row.handle),
    name: displayName(row.name, row.handle),
  }));
}

export async function getLeaderboard(board: BoardKey, range: RangeKey) {
  const rows = await getUsageRows(range);
  return rankUsageRows(rows, { board, range }).slice(0, LEADERBOARD_LIMIT);
}

export async function getProfile(handle: string) {
  const db = await getDb();
  const normalizedHandle = handle.replace(/^@+/, "").trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.xHandle, normalizedHandle)).limit(1);

  if (!user || !user.profilePublic) {
    return null;
  }

  const rows = await db
    .select({
      id: dailyUsage.id,
      usageDate: dailyUsage.usageDate,
      tool: dailyUsage.tool,
      model: dailyUsage.model,
      inputTokens: dailyUsage.inputTokens,
      outputTokens: dailyUsage.outputTokens,
      cacheReadTokens: dailyUsage.cacheReadTokens,
      cacheWriteTokens: dailyUsage.cacheWriteTokens,
      totalTokens: dailyUsage.totalTokens,
      estimatedCostMicros: dailyUsage.estimatedCostMicros,
      blocked: dailyUsage.blocked,
      updatedAt: dailyUsage.updatedAt,
      deviceId: devices.id,
      deviceLabel: devices.label,
    })
    .from(dailyUsage)
    .innerJoin(devices, eq(devices.id, dailyUsage.deviceId))
    .where(
      and(
        eq(dailyUsage.userId, user.id),
        eq(dailyUsage.blocked, false),
        eq(devices.blocked, false),
      ),
    )
    .orderBy(desc(dailyUsage.usageDate));

  return {
    user: sanitizePublicUser(user),
    daily: rows,
  };
}

export async function upsertUploadedUsage(
  token: string,
  deviceId: string,
  entries: TokenUsageEntry[],
): Promise<UploadResult> {
  const db = await getDb();
  const tokenHash = hashSecret(token);
  const [webhook] = await db
    .select()
    .from(webhookTokens)
    .where(and(eq(webhookTokens.tokenHash, tokenHash), eq(webhookTokens.status, "active")))
    .limit(1);

  if (!webhook) {
    return { ok: false, status: 401 };
  }

  const deviceHash = hashSecret(deviceId);
  const deviceUpsert = db
    .insert(devices)
    .values({
      userId: webhook.userId,
      deviceHash,
      label: "Local device",
    })
    .onConflictDoUpdate({
      target: [devices.userId, devices.deviceHash],
      set: { lastSeenAt: sql`now()` },
    });
  const deviceIdSubquery = sql<string>`(
    select ${devices.id}
    from ${devices}
    where ${devices.userId} = ${webhook.userId}
      and ${devices.deviceHash} = ${deviceHash}
    limit 1
  )`;
  const cleanupQueries = entries
    .filter((entry) => !isUnattributedModel(entry.model, entry.tool))
    .map((entry) =>
      db
        .delete(dailyUsage)
        .where(
          and(
            eq(dailyUsage.userId, webhook.userId),
            eq(dailyUsage.deviceId, deviceIdSubquery),
            eq(dailyUsage.usageDate, entry.date),
            eq(dailyUsage.tool, entry.tool),
            unattributedModelCondition(entry.tool),
          ),
        ),
    );
  const usageUpserts = entries.map((entry) => {
    const estimatedCostMicros = estimateCostMicros(entry);
    const totalTokens = canonicalTotalTokens(entry);

    return db
      .insert(dailyUsage)
      .values({
        userId: webhook.userId,
        deviceId: deviceIdSubquery,
        usageDate: entry.date,
        tool: entry.tool,
        model: entry.model,
        inputTokens: entry.input,
        outputTokens: entry.output,
        cacheReadTokens: entry.cacheRead,
        cacheWriteTokens: entry.cacheWrite,
        totalTokens,
        estimatedCostMicros,
      })
      .onConflictDoUpdate({
        target: [
          dailyUsage.userId,
          dailyUsage.deviceId,
          dailyUsage.usageDate,
          dailyUsage.tool,
          dailyUsage.model,
        ],
        set: {
          inputTokens: entry.input,
          outputTokens: entry.output,
          cacheReadTokens: entry.cacheRead,
          cacheWriteTokens: entry.cacheWrite,
          totalTokens,
          estimatedCostMicros,
          updatedAt: sql`now()`,
        },
      });
  });
  const webhookUpdate = db
    .update(webhookTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(webhookTokens.id, webhook.id));

  // neon-http has no interactive transaction support; batch is atomic through
  // the underlying Neon HTTP transaction API and requires a non-empty tuple.
  const batchQueries = [deviceUpsert, ...cleanupQueries, ...usageUpserts, webhookUpdate] as [
    PgBatchItem,
    ...PgBatchItem[],
  ];

  await db.batch(batchQueries);

  return { ok: true, status: 200, uploaded: entries.length };
}

function unattributedModelForTool(tool: string): string {
  return `${tool}-unattributed`;
}

function isUnattributedModel(model: string, tool: string): boolean {
  const normalized = model.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "unknown" ||
    normalized === "undefined" ||
    normalized === "null" ||
    normalized === unattributedModelForTool(tool)
  );
}

function unattributedModelCondition(tool: string) {
  return sql`
    lower(${dailyUsage.model}) in ('unknown', 'undefined', 'null')
    or trim(${dailyUsage.model}) = ''
    or lower(${dailyUsage.model}) = ${unattributedModelForTool(tool)}
  `;
}
