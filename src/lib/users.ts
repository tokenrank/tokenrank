import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { dailyUsage, devices, users, webhookTokens } from "../db/schema";

import { estimateCostMicros } from "./pricing";
import { getRangeStart, rankUsageRows } from "./ranking/ranking";
import { hashSecret } from "./security/tokens";
import type { BoardKey, RangeKey, TokenUsageEntry, UsageRow } from "./types";

type UserRow = typeof users.$inferSelect;

export type PublicProfileUser = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  profilePublic: boolean;
  rankingEnabled: boolean;
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
  return rankUsageRows(rows, { board, range });
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
    })
    .from(dailyUsage)
    .where(eq(dailyUsage.userId, user.id))
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
  await db.transaction(async (tx) => {
    const [device] = await tx
      .insert(devices)
      .values({
        userId: webhook.userId,
        deviceHash,
        label: "Local device",
      })
      .onConflictDoUpdate({
        target: [devices.userId, devices.deviceHash],
        set: { lastSeenAt: sql`now()` },
      })
      .returning();

    for (const entry of entries) {
      const estimatedCostMicros = estimateCostMicros(entry);

      await tx
        .insert(dailyUsage)
        .values({
          userId: webhook.userId,
          deviceId: device.id,
          usageDate: entry.date,
          tool: entry.tool,
          model: entry.model,
          inputTokens: entry.input,
          outputTokens: entry.output,
          cacheReadTokens: entry.cacheRead,
          cacheWriteTokens: entry.cacheWrite,
          totalTokens: entry.total,
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
            totalTokens: entry.total,
            estimatedCostMicros,
            updatedAt: sql`now()`,
          },
        });
    }

    await tx
      .update(webhookTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(webhookTokens.id, webhook.id));
  });

  return { ok: true, status: 200, uploaded: entries.length };
}
