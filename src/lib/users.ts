import { and, desc, eq, gte, isNotNull, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import {
  anomalyFlags,
  dailyUsage,
  devices,
  usageSnapshotBatches,
  usageSnapshotRows,
  usageSnapshots,
  users,
  webhookTokens,
} from "../db/schema";

import { estimateCostMicros } from "./pricing";
import { getRangeStart, rankUsageRows } from "./ranking/ranking";
import { hashSecret } from "./security/tokens";
import { canonicalTotalTokens } from "./token-metrics";
import type { BoardKey, RangeKey, TokenUsageEntry, UsageRow } from "./types";
import type { UploadSyncOptions } from "./collector/upload";
import { isDemoUserId, shouldExposeDemoData } from "./demo-data";

type UserRow = typeof users.$inferSelect;
type PgBatchItem = BatchItem<"pg">;
const LEADERBOARD_LIMIT = 100;
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DEVICES_PER_USER = 16;
const MAX_ACTIVE_SNAPSHOTS_PER_USER = 4;
const QUALIFIED_DEVICES_ID = sql.raw('"devices"."id"');
const QUALIFIED_DAILY_USAGE_ID = sql.raw('"daily_usage"."id"');

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
  | { ok: true; status: 200; uploaded: number; committed: boolean; revision: number }
  | { ok: false; status: 401 }
  | {
      ok: false;
      status: 409;
      error:
        | "upgrade_required"
        | "cutover_required"
        | "snapshot_conflict"
        | "device_limit";
    }
  | {
      ok: false;
      status: 409;
      error: "cutover_date_conflict";
      expectedCutoverDate: string;
      revision: number;
    }
  | {
      ok: false;
      status: 409;
      error: "active_snapshot_conflict";
      activeSnapshotId: string;
      expectedCutoverDate: string;
      revision: number;
    };

export type AuthenticatedUploadToken = {
  id: string;
  userId: string;
};

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

function postgresErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") {
    return candidate.code;
  }

  return candidate.cause === error ? null : postgresErrorCode(candidate.cause);
}

function visibleAccountingRows() {
  return or(
    and(isNull(devices.cutoverDate), eq(dailyUsage.accountingVersion, 1)),
    and(
      isNotNull(devices.cutoverDate),
      or(
        and(
          eq(dailyUsage.accountingVersion, 1),
          lt(dailyUsage.usageDate, devices.cutoverDate),
        ),
        and(
          eq(dailyUsage.accountingVersion, 2),
          gte(dailyUsage.usageDate, devices.cutoverDate),
        ),
      ),
    ),
  );
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
    .where(
      and(
        eq(dailyUsage.userId, userId),
        eq(dailyUsage.blocked, false),
        eq(devices.blocked, false),
        visibleAccountingRows(),
      ),
    );

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
    .where(
      and(
        eq(dailyUsage.userId, user.id),
        eq(dailyUsage.blocked, false),
        eq(devices.blocked, false),
        visibleAccountingRows(),
      ),
    )
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
        visibleAccountingRows(),
        gte(dailyUsage.usageDate, start),
        lte(dailyUsage.usageDate, end),
      ),
    );

  const publicRows = shouldExposeDemoData()
    ? rows
    : rows.filter((row) => !isDemoUserId(row.userId));

  return publicRows.map((row) => ({
    ...row,
    handle: displayHandle(row.handle),
    name: displayName(row.name, row.handle),
  }));
}

export async function getLeaderboard(board: BoardKey, range: RangeKey) {
  const rows = await getUsageRows(range);
  return rankUsageRows(rows, { board, range }).slice(0, LEADERBOARD_LIMIT);
}

export async function getPublicProfileSitemapEntries() {
  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      handle: users.xHandle,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(and(eq(users.profilePublic, true), isNotNull(users.xHandle)))
    .orderBy(desc(users.updatedAt));

  return rows.flatMap((row) => {
    if (!shouldExposeDemoData() && isDemoUserId(row.id)) {
      return [];
    }

    const handle = row.handle?.trim();
    return handle ? [{ handle, updatedAt: row.updatedAt }] : [];
  });
}

export async function getProfile(handle: string) {
  const db = await getDb();
  const normalizedHandle = handle.replace(/^@+/, "").trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.xHandle, normalizedHandle)).limit(1);

  if (
    !user ||
    !user.profilePublic ||
    (!shouldExposeDemoData() && isDemoUserId(user.id))
  ) {
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
        visibleAccountingRows(),
      ),
    )
    .orderBy(desc(dailyUsage.usageDate));

  return {
    user: sanitizePublicUser(user),
    daily: rows,
  };
}

export async function authenticateUploadToken(
  token: string,
): Promise<AuthenticatedUploadToken | null> {
  const db = await getDb();
  const tokenHash = hashSecret(token);
  const [webhook] = await db
    .select({ id: webhookTokens.id, userId: webhookTokens.userId })
    .from(webhookTokens)
    .where(and(eq(webhookTokens.tokenHash, tokenHash), eq(webhookTokens.status, "active")))
    .limit(1);

  return webhook ?? null;
}

export async function upsertUploadedUsage(
  token: string,
  deviceId: string,
  entries: TokenUsageEntry[],
  sync?: UploadSyncOptions,
  authenticatedWebhook?: AuthenticatedUploadToken,
): Promise<UploadResult> {
  const db = await getDb();
  const webhook = authenticatedWebhook ?? (await authenticateUploadToken(token));

  if (!webhook) {
    return { ok: false, status: 401 };
  }

  const deviceHash = hashSecret(deviceId);
  const [existingDevice] = await db
    .select({
      accountingVersion: devices.accountingVersion,
      cutoverDate: devices.cutoverDate,
      snapshotRevision: devices.snapshotRevision,
      receivingCutoverDate: sql<string | null>`(
        select ${usageSnapshots.cutoverDate}
        from ${usageSnapshots}
        where ${usageSnapshots.userId} = ${webhook.userId}
          and ${usageSnapshots.deviceId} = ${QUALIFIED_DEVICES_ID}
          and ${usageSnapshots.status} = 'receiving'
        order by ${usageSnapshots.createdAt} desc
        limit 1
      )`,
      hasReceivingSnapshot: sql<boolean>`exists (
        select 1
        from ${usageSnapshots}
        where ${usageSnapshots.userId} = ${webhook.userId}
          and ${usageSnapshots.deviceId} = ${QUALIFIED_DEVICES_ID}
          and ${usageSnapshots.status} = 'receiving'
      )`,
    })
    .from(devices)
    .where(and(eq(devices.userId, webhook.userId), eq(devices.deviceHash, deviceHash)))
    .limit(1);

  if (
    !sync &&
    existingDevice &&
    (existingDevice.accountingVersion >= 2 || existingDevice.hasReceivingSnapshot)
  ) {
    return { ok: false, status: 409, error: "upgrade_required" };
  }

  if (sync?.syncMode === "incremental" && !existingDevice?.cutoverDate) {
    return { ok: false, status: 409, error: "cutover_required" };
  }

  if (
    sync?.syncMode === "incremental" &&
    existingDevice?.cutoverDate &&
    entries.some((entry) => entry.date < existingDevice.cutoverDate!)
  ) {
    return { ok: false, status: 409, error: "snapshot_conflict" };
  }

  const expectedFullCutoverDate =
    existingDevice?.cutoverDate ??
    existingDevice?.receivingCutoverDate ??
    toUtcDateKey(new Date());

  if (sync?.syncMode === "full" && sync.cutoverDate !== expectedFullCutoverDate) {
    return {
      ok: false,
      status: 409,
      error: "cutover_date_conflict",
      expectedCutoverDate: expectedFullCutoverDate,
      revision: existingDevice?.snapshotRevision ?? 0,
    };
  }

  if (!existingDevice) {
    const [deviceUsage] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(devices)
      .where(eq(devices.userId, webhook.userId));

    if ((deviceUsage?.count ?? 0) >= MAX_DEVICES_PER_USER) {
      return { ok: false, status: 409, error: "device_limit" };
    }
  }

  const deviceUpsert = db
    .insert(devices)
    .values({
      userId: webhook.userId,
      deviceHash,
      label: "Local device",
      accountingVersion: 1,
      cutoverDate: null,
      snapshotRevision: 0,
    })
    .onConflictDoUpdate({
      target: [devices.userId, devices.deviceHash],
      set: {
        lastSeenAt: sql`now()`,
      },
    });
  const deviceIdSubquery = sql<string>`(
    select ${devices.id}
    from ${devices}
    where ${devices.userId} = ${webhook.userId}
      and ${devices.deviceHash} = ${deviceHash}
    limit 1
  )`;
  const writableLegacyDeviceIdSubquery = sql<string>`(
    select ${devices.id}
    from ${devices}
    where ${devices.userId} = ${webhook.userId}
      and ${devices.deviceHash} = ${deviceHash}
      and ${devices.accountingVersion} < 2
      and not exists (
        select 1
        from ${usageSnapshots}
        where ${usageSnapshots.userId} = ${webhook.userId}
          and ${usageSnapshots.deviceId} = ${QUALIFIED_DEVICES_ID}
          and ${usageSnapshots.status} = 'receiving'
      )
    limit 1
  )`;
  const webhookUpdate = db
    .update(webhookTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(webhookTokens.id, webhook.id));
  if (sync?.syncMode === "full") {
    const snapshotRowIdSubquery = sql<string>`(
      select ${usageSnapshots.id}
      from ${usageSnapshots}
      where ${usageSnapshots.userId} = ${webhook.userId}
        and ${usageSnapshots.deviceId} = ${deviceIdSubquery}
        and ${usageSnapshots.snapshotId} = ${sync.snapshotId}
      limit 1
    )`;
    const [existingSnapshot] = await db
      .select({
        id: usageSnapshots.id,
        revision: usageSnapshots.revision,
        batchCount: usageSnapshots.batchCount,
        cutoverDate: usageSnapshots.cutoverDate,
        status: usageSnapshots.status,
      })
      .from(usageSnapshots)
      .where(
        and(
          eq(usageSnapshots.userId, webhook.userId),
          eq(usageSnapshots.deviceId, deviceIdSubquery),
          eq(usageSnapshots.snapshotId, sync.snapshotId),
        ),
      )
      .limit(1);

    if (
      existingSnapshot &&
      (existingSnapshot.batchCount !== sync.batchCount ||
        existingSnapshot.cutoverDate !== sync.cutoverDate)
    ) {
      return { ok: false, status: 409, error: "snapshot_conflict" };
    }

    const [activeSnapshot] = await db
      .select({
        snapshotId: usageSnapshots.snapshotId,
        revision: usageSnapshots.revision,
        cutoverDate: usageSnapshots.cutoverDate,
        createdAt: usageSnapshots.createdAt,
      })
      .from(usageSnapshots)
      .where(
        and(
          eq(usageSnapshots.userId, webhook.userId),
          eq(usageSnapshots.deviceId, deviceIdSubquery),
          eq(usageSnapshots.status, "receiving"),
        ),
      )
      .orderBy(desc(usageSnapshots.createdAt))
      .limit(1);
    const hasDifferentActiveSnapshot =
      typeof activeSnapshot?.snapshotId === "string" &&
      activeSnapshot.snapshotId !== sync.snapshotId;
    const activeSnapshotIsStale =
      hasDifferentActiveSnapshot &&
      activeSnapshot.createdAt instanceof Date &&
      Date.now() - activeSnapshot.createdAt.getTime() >= SNAPSHOT_TTL_MS;

    if (activeSnapshot && hasDifferentActiveSnapshot && !activeSnapshotIsStale) {
      return {
        ok: false,
        status: 409,
        error: "active_snapshot_conflict",
        activeSnapshotId: activeSnapshot.snapshotId,
        expectedCutoverDate: activeSnapshot.cutoverDate,
        revision: activeSnapshot.revision,
      };
    }

    const [existingBatch] = await db
      .select({ batchHash: usageSnapshotBatches.batchHash })
      .from(usageSnapshotBatches)
      .where(
        and(
          eq(usageSnapshotBatches.snapshotRowId, snapshotRowIdSubquery),
          eq(usageSnapshotBatches.batchIndex, sync.batchIndex),
        ),
      )
      .limit(1);

    if (existingBatch && existingBatch.batchHash !== sync.batchHash) {
      return { ok: false, status: 409, error: "snapshot_conflict" };
    }

    if (existingSnapshot?.status === "committed") {
      return {
        ok: true,
        status: 200,
        uploaded: entries.length,
        committed: true,
        revision: existingSnapshot.revision,
      };
    }

    let snapshotRevision = existingSnapshot?.revision ?? 0;

    if (!existingBatch) {
      const snapshotInsert = db
        .insert(usageSnapshots)
        .select(
          db
            .select({
              id: sql<string>`gen_random_uuid()`.as("id"),
              userId: sql<string>`${webhook.userId}`.as("user_id"),
              deviceId: devices.id,
              snapshotId: sql<string>`${sync.snapshotId}`.as("snapshot_id"),
              revision: sql<number>`${devices.snapshotRevision} + 1`.as("revision"),
              batchCount: sql<number>`${sync.batchCount}`.as("batch_count"),
              cutoverDate: sql<string>`${sync.cutoverDate}`.as("cutover_date"),
              status: sql<"receiving">`'receiving'::text`.as("status"),
              createdAt: sql<Date>`now()`.as("created_at"),
              committedAt: sql<Date | null>`null::timestamp`.as("committed_at"),
            })
            .from(devices)
            .where(
              and(
                eq(devices.userId, webhook.userId),
                eq(devices.deviceHash, deviceHash),
                or(isNull(devices.cutoverDate), eq(devices.cutoverDate, sync.cutoverDate)),
                sql`(
                  select count(*)
                  from ${usageSnapshots}
                  where ${usageSnapshots.userId} = ${webhook.userId}
                    and ${usageSnapshots.status} = 'receiving'
                ) < ${MAX_ACTIVE_SNAPSHOTS_PER_USER}`,
              ),
            ),
        )
        .onConflictDoNothing();
      const batchInsert = db
        .insert(usageSnapshotBatches)
        .select(
          db
            .select({
              snapshotRowId: usageSnapshots.id,
              batchIndex: sql<number>`${sync.batchIndex}`.as("batch_index"),
              batchHash: sql<string>`${sync.batchHash}`.as("batch_hash"),
              rowCount: sql<number>`${entries.length}`.as("row_count"),
              createdAt: sql<Date>`now()`.as("created_at"),
            })
            .from(usageSnapshots)
            .where(
              and(
                eq(usageSnapshots.userId, webhook.userId),
                eq(usageSnapshots.deviceId, deviceIdSubquery),
                eq(usageSnapshots.snapshotId, sync.snapshotId),
                eq(usageSnapshots.batchCount, sync.batchCount),
                eq(usageSnapshots.cutoverDate, sync.cutoverDate),
                eq(usageSnapshots.status, "receiving"),
              ),
            ),
        )
        .onConflictDoUpdate({
          target: [
            usageSnapshotBatches.snapshotRowId,
            usageSnapshotBatches.batchIndex,
          ],
          set: {
            batchHash: sync.batchHash,
            rowCount: entries.length,
          },
          setWhere: eq(usageSnapshotBatches.batchHash, sync.batchHash),
        });
      const stagedRowsJson = JSON.stringify(
        entries.map((entry) => ({
          usage_date: entry.date,
          tool: entry.tool,
          model: entry.model,
          input_tokens: entry.input,
          output_tokens: entry.output,
          cache_read_tokens: entry.cacheRead,
          cache_write_tokens: entry.cacheWrite,
          total_tokens: canonicalTotalTokens(entry),
          estimated_cost_micros: estimateCostMicros(entry),
        })),
      );
      const stagedInput = sql`
        jsonb_to_recordset(${stagedRowsJson}::jsonb) as staged_input(
          usage_date date,
          tool text,
          model text,
          input_tokens bigint,
          output_tokens bigint,
          cache_read_tokens bigint,
          cache_write_tokens bigint,
          total_tokens bigint,
          estimated_cost_micros bigint
        )
      `;
      const stageRowsSelect = db
        .select({
          id: sql<string>`gen_random_uuid()`.as("id"),
          snapshotRowId: usageSnapshotBatches.snapshotRowId,
          batchIndex: sql<number>`${sync.batchIndex}`.as("batch_index"),
          usageDate: sql<string>`staged_input.usage_date`.as("usage_date"),
          tool: sql<TokenUsageEntry["tool"]>`staged_input.tool::"tool"`.as("tool"),
          model: sql<string>`staged_input.model`.as("model"),
          inputTokens: sql<number>`staged_input.input_tokens`.as("input_tokens"),
          outputTokens: sql<number>`staged_input.output_tokens`.as("output_tokens"),
          cacheReadTokens: sql<number>`staged_input.cache_read_tokens`.as(
            "cache_read_tokens",
          ),
          cacheWriteTokens: sql<number>`staged_input.cache_write_tokens`.as(
            "cache_write_tokens",
          ),
          totalTokens: sql<number>`staged_input.total_tokens`.as("total_tokens"),
          estimatedCostMicros: sql<number>`staged_input.estimated_cost_micros`.as(
            "estimated_cost_micros",
          ),
        })
        .from(stagedInput)
        .innerJoin(
          usageSnapshotBatches,
          and(
            eq(usageSnapshotBatches.snapshotRowId, snapshotRowIdSubquery),
            eq(usageSnapshotBatches.batchIndex, sync.batchIndex),
            eq(usageSnapshotBatches.batchHash, sync.batchHash),
          ),
        )
        .innerJoin(
          usageSnapshots,
          and(
            eq(usageSnapshots.id, usageSnapshotBatches.snapshotRowId),
            eq(usageSnapshots.batchCount, sync.batchCount),
            eq(usageSnapshots.cutoverDate, sync.cutoverDate),
            eq(usageSnapshots.status, "receiving"),
          ),
        );
      const stageRows = db
        .insert(usageSnapshotRows)
        .select(stageRowsSelect)
        .onConflictDoNothing();
      const stageLock = db.select({
        userLocked: sql<void>`pg_advisory_xact_lock(hashtextextended(${webhook.userId}, 1))`,
        deviceLocked: sql<void>`pg_advisory_xact_lock(hashtextextended(${`${webhook.userId}:${deviceHash}`}, 0))`,
      }).from(sql`(select 1) as lock_source`);
      const pruneStaleUserSnapshots = db.delete(usageSnapshots).where(
        and(
          eq(usageSnapshots.userId, webhook.userId),
          eq(usageSnapshots.status, "receiving"),
          lte(
            usageSnapshots.createdAt,
            new Date(Date.now() - SNAPSHOT_TTL_MS),
          ),
        ),
      );
      const stageQueries = [
        stageLock,
        deviceUpsert,
        pruneStaleUserSnapshots,
        snapshotInsert,
        batchInsert,
        stageRows,
        webhookUpdate,
      ] as [PgBatchItem, ...PgBatchItem[]];

      await db.batch(stageQueries);

      const [stagedBatch] = await db
        .select({
          batchHash: usageSnapshotBatches.batchHash,
          revision: usageSnapshots.revision,
          batchCount: usageSnapshots.batchCount,
          cutoverDate: usageSnapshots.cutoverDate,
          status: usageSnapshots.status,
        })
        .from(usageSnapshotBatches)
        .innerJoin(usageSnapshots, eq(usageSnapshots.id, usageSnapshotBatches.snapshotRowId))
        .where(
          and(
            eq(usageSnapshotBatches.snapshotRowId, snapshotRowIdSubquery),
            eq(usageSnapshotBatches.batchIndex, sync.batchIndex),
          ),
        )
        .limit(1);

      if (
        !stagedBatch ||
        stagedBatch.batchHash !== sync.batchHash ||
        stagedBatch.batchCount !== sync.batchCount ||
        stagedBatch.cutoverDate !== sync.cutoverDate
      ) {
        return { ok: false, status: 409, error: "snapshot_conflict" };
      }

      if (stagedBatch.status === "committed") {
        return {
          ok: true,
          status: 200,
          uploaded: entries.length,
          committed: true,
          revision: stagedBatch.revision,
        };
      }

      if (stagedBatch.status !== "receiving") {
        return { ok: false, status: 409, error: "snapshot_conflict" };
      }

      snapshotRevision = stagedBatch.revision;
    }

    const receivedBatches = await db
      .select({ batchIndex: usageSnapshotBatches.batchIndex })
      .from(usageSnapshotBatches)
      .where(eq(usageSnapshotBatches.snapshotRowId, snapshotRowIdSubquery));
    const receivedIndexes = new Set(receivedBatches.map((batch) => batch.batchIndex));
    const hasCompleteSnapshot =
      receivedIndexes.size === sync.batchCount &&
      Array.from({ length: sync.batchCount }, (_, index) => index).every((index) =>
        receivedIndexes.has(index),
      );

    if (!hasCompleteSnapshot) {
      return {
        ok: true,
        status: 200,
        uploaded: entries.length,
        committed: false,
        revision: snapshotRevision,
      };
    }

    const [snapshotIntegrity] = await db
      .select({
        stagedRowCount: sql<number>`(
          select count(*)::int
          from ${usageSnapshotRows}
          where ${usageSnapshotRows.snapshotRowId} = ${snapshotRowIdSubquery}
        )`,
        declaredRowCount: sql<number>`(
          select coalesce(sum(${usageSnapshotBatches.rowCount}), 0)::int
          from ${usageSnapshotBatches}
          where ${usageSnapshotBatches.snapshotRowId} = ${snapshotRowIdSubquery}
        )`,
      })
      .from(usageSnapshots)
      .where(
        and(
          eq(usageSnapshots.id, snapshotRowIdSubquery),
          eq(usageSnapshots.status, "receiving"),
        ),
      )
      .limit(1);

    if (
      !snapshotIntegrity ||
      snapshotIntegrity.stagedRowCount !== snapshotIntegrity.declaredRowCount
    ) {
      return { ok: false, status: 409, error: "snapshot_conflict" };
    }

    const stagedRowsSelect = db
      .select({
        id: sql<string>`gen_random_uuid()`.as("id"),
        userId: sql<string>`${webhook.userId}`.as("user_id"),
        deviceId: sql<string>`${deviceIdSubquery}`.as("device_id"),
        usageDate: usageSnapshotRows.usageDate,
        tool: usageSnapshotRows.tool,
        model: usageSnapshotRows.model,
        inputTokens: usageSnapshotRows.inputTokens,
        outputTokens: usageSnapshotRows.outputTokens,
        cacheReadTokens: usageSnapshotRows.cacheReadTokens,
        cacheWriteTokens: usageSnapshotRows.cacheWriteTokens,
        totalTokens: usageSnapshotRows.totalTokens,
        estimatedCostMicros: usageSnapshotRows.estimatedCostMicros,
        accountingVersion: sql<number>`2`.as("accounting_version"),
        snapshotId: sql<string>`${sync.snapshotId}`.as("snapshot_id"),
        blocked: sql<boolean>`false`.as("blocked"),
        updatedAt: sql<Date>`now()`.as("updated_at"),
      })
      .from(usageSnapshotRows)
      .where(
        and(
          eq(usageSnapshotRows.snapshotRowId, snapshotRowIdSubquery),
          sql`exists (
            select 1
            from ${usageSnapshots}
            where ${usageSnapshots.id} = ${snapshotRowIdSubquery}
              and ${usageSnapshots.status} = 'receiving'
          )`,
        ),
      );
    const mergeLegacyRowsIntoSnapshot = db
      .insert(usageSnapshotRows)
      .select(
        db
          .select({
            id: sql<string>`gen_random_uuid()`.as("id"),
            snapshotRowId: sql<string>`${snapshotRowIdSubquery}`.as("snapshot_row_id"),
            batchIndex: sql<number>`0`.as("batch_index"),
            usageDate: dailyUsage.usageDate,
            tool: dailyUsage.tool,
            model: dailyUsage.model,
            inputTokens: dailyUsage.inputTokens,
            outputTokens: dailyUsage.outputTokens,
            cacheReadTokens: dailyUsage.cacheReadTokens,
            cacheWriteTokens: dailyUsage.cacheWriteTokens,
            totalTokens: dailyUsage.totalTokens,
            estimatedCostMicros: dailyUsage.estimatedCostMicros,
          })
          .from(dailyUsage)
          .where(
            and(
              eq(dailyUsage.userId, webhook.userId),
              eq(dailyUsage.deviceId, deviceIdSubquery),
              eq(dailyUsage.accountingVersion, 1),
              eq(dailyUsage.blocked, false),
              sql`not exists (
                select 1
                from ${anomalyFlags}
                where ${anomalyFlags.dailyUsageId} = ${QUALIFIED_DAILY_USAGE_ID}
              )`,
              gte(dailyUsage.usageDate, sync.cutoverDate),
              sql`exists (
                select 1
                from ${usageSnapshots}
                where ${usageSnapshots.id} = ${snapshotRowIdSubquery}
                  and ${usageSnapshots.status} = 'receiving'
              )`,
              sql`exists (
                select 1
                from ${devices}
                where ${devices.id} = ${deviceIdSubquery}
                  and ${devices.cutoverDate} is null
              )`,
            ),
          ),
      )
      .onConflictDoUpdate({
        target: [
          usageSnapshotRows.snapshotRowId,
          usageSnapshotRows.usageDate,
          usageSnapshotRows.tool,
          usageSnapshotRows.model,
        ],
        set: {
          inputTokens: sql`greatest(${usageSnapshotRows.inputTokens}, excluded.input_tokens)`,
          outputTokens: sql`greatest(${usageSnapshotRows.outputTokens}, excluded.output_tokens)`,
          cacheReadTokens: sql`greatest(${usageSnapshotRows.cacheReadTokens}, excluded.cache_read_tokens)`,
          cacheWriteTokens: sql`greatest(${usageSnapshotRows.cacheWriteTokens}, excluded.cache_write_tokens)`,
          totalTokens: sql`greatest(${usageSnapshotRows.totalTokens}, excluded.total_tokens)`,
          estimatedCostMicros: sql`greatest(${usageSnapshotRows.estimatedCostMicros}, excluded.estimated_cost_micros)`,
        },
      });
    const preserveAuditedCutoverRows = db
      .update(dailyUsage)
      .set({
        accountingVersion: 2,
        snapshotId: sync.snapshotId,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(dailyUsage.userId, webhook.userId),
          eq(dailyUsage.deviceId, deviceIdSubquery),
          eq(dailyUsage.accountingVersion, 1),
          or(
            eq(dailyUsage.blocked, true),
            sql`exists (
              select 1
              from ${anomalyFlags}
              where ${anomalyFlags.dailyUsageId} = ${QUALIFIED_DAILY_USAGE_ID}
            )`,
          ),
          gte(dailyUsage.usageDate, sync.cutoverDate),
          sql`exists (
            select 1
            from ${usageSnapshots}
            where ${usageSnapshots.id} = ${snapshotRowIdSubquery}
              and ${usageSnapshots.status} = 'receiving'
          )`,
          sql`exists (
            select 1
            from ${devices}
            where ${devices.id} = ${deviceIdSubquery}
              and ${devices.cutoverDate} is null
          )`,
        ),
      );
    const clearCutoverRows = db.delete(dailyUsage).where(
      and(
        eq(dailyUsage.userId, webhook.userId),
        eq(dailyUsage.deviceId, deviceIdSubquery),
        eq(dailyUsage.blocked, false),
        sql`not exists (
          select 1
          from ${anomalyFlags}
          where ${anomalyFlags.dailyUsageId} = ${QUALIFIED_DAILY_USAGE_ID}
        )`,
        gte(dailyUsage.usageDate, sync.cutoverDate),
        sql`exists (
          select 1
          from ${usageSnapshots}
          where ${usageSnapshots.id} = ${snapshotRowIdSubquery}
            and ${usageSnapshots.status} = 'receiving'
        )`,
        sql`exists (
          select 1
          from ${devices}
          where ${devices.id} = ${deviceIdSubquery}
            and ${devices.cutoverDate} is null
        )`,
      ),
    );
    const publishStagedRows = db
      .insert(dailyUsage)
      .select(stagedRowsSelect)
      .onConflictDoUpdate({
        target: [
          dailyUsage.userId,
          dailyUsage.deviceId,
          dailyUsage.usageDate,
          dailyUsage.tool,
          dailyUsage.model,
          dailyUsage.accountingVersion,
        ],
        set: {
          inputTokens: sql`greatest(${dailyUsage.inputTokens}, excluded.input_tokens)`,
          outputTokens: sql`greatest(${dailyUsage.outputTokens}, excluded.output_tokens)`,
          cacheReadTokens: sql`greatest(${dailyUsage.cacheReadTokens}, excluded.cache_read_tokens)`,
          cacheWriteTokens: sql`greatest(${dailyUsage.cacheWriteTokens}, excluded.cache_write_tokens)`,
          totalTokens: sql`greatest(${dailyUsage.totalTokens}, excluded.total_tokens)`,
          estimatedCostMicros: sql`greatest(${dailyUsage.estimatedCostMicros}, excluded.estimated_cost_micros)`,
          snapshotId: sync.snapshotId,
          updatedAt: sql`now()`,
        },
      });
    const clearStagedRows = db
      .delete(usageSnapshotRows)
      .where(eq(usageSnapshotRows.snapshotRowId, snapshotRowIdSubquery));
    const markDeviceUpgraded = db
      .update(devices)
      .set({
        accountingVersion: 2,
        cutoverDate: sql`coalesce(${devices.cutoverDate}, ${sync.cutoverDate})`,
        snapshotRevision: sql`(
          select ${usageSnapshots.revision}
          from ${usageSnapshots}
          where ${usageSnapshots.id} = ${snapshotRowIdSubquery}
            and ${usageSnapshots.status} = 'receiving'
        )`,
        lastSeenAt: sql`now()`,
      })
      .where(
        and(
          eq(devices.id, deviceIdSubquery),
          sql`exists (
            select 1
            from ${usageSnapshots}
            where ${usageSnapshots.id} = ${snapshotRowIdSubquery}
              and ${usageSnapshots.status} = 'receiving'
          )`,
        ),
      );
    const commitSnapshot = db
      .update(usageSnapshots)
      .set({ status: "committed", committedAt: new Date() })
      .where(
        and(
          eq(usageSnapshots.id, snapshotRowIdSubquery),
          eq(usageSnapshots.status, "receiving"),
        ),
      );
    const pruneCommittedSnapshots = db.delete(usageSnapshots).where(
      and(
        eq(usageSnapshots.userId, webhook.userId),
        eq(usageSnapshots.deviceId, deviceIdSubquery),
        eq(usageSnapshots.status, "committed"),
        ne(usageSnapshots.id, snapshotRowIdSubquery),
        lt(usageSnapshots.committedAt, sql`now() - interval '7 days'`),
      ),
    );
    const commitLock = db.select({
      locked: sql<void>`pg_advisory_xact_lock(hashtextextended(${`${webhook.userId}:${deviceHash}`}, 0))`,
    }).from(sql`(select 1) as lock_source`);
    const commitQueries = [
      commitLock,
      mergeLegacyRowsIntoSnapshot,
      preserveAuditedCutoverRows,
      clearCutoverRows,
      publishStagedRows,
      clearStagedRows,
      markDeviceUpgraded,
      commitSnapshot,
      webhookUpdate,
      pruneCommittedSnapshots,
    ] as [PgBatchItem, ...PgBatchItem[]];

    await db.batch(commitQueries);

    const [committedSnapshot] = await db
      .select({ revision: usageSnapshots.revision, status: usageSnapshots.status })
      .from(usageSnapshots)
      .where(
        and(
          eq(usageSnapshots.userId, webhook.userId),
          eq(usageSnapshots.deviceId, deviceIdSubquery),
          eq(usageSnapshots.snapshotId, sync.snapshotId),
        ),
      )
      .limit(1);

    if (!committedSnapshot || committedSnapshot.status !== "committed") {
      return { ok: false, status: 409, error: "snapshot_conflict" };
    }

    return {
      ok: true,
      status: 200,
      uploaded: entries.length,
      committed: true,
      revision: committedSnapshot.revision,
    };
  }

  const attributedEntries = sync
    ? []
    : entries.filter((entry) => !isUnattributedModel(entry.model, entry.tool));
  const unattributedCleanup = attributedEntries.length
    ? db.delete(dailyUsage).where(
        and(
          eq(dailyUsage.userId, webhook.userId),
          eq(dailyUsage.deviceId, deviceIdSubquery),
          eq(dailyUsage.accountingVersion, sync ? 2 : 1),
          or(
            ...attributedEntries.map((entry) =>
              and(
                eq(dailyUsage.usageDate, entry.date),
                eq(dailyUsage.tool, entry.tool),
                unattributedModelCondition(entry.tool),
              ),
            ),
          ),
        ),
      )
    : null;
  const usageUpsert = entries.length
    ? db
        .insert(dailyUsage)
        .values(
          entries.map((entry) => ({
            userId: webhook.userId,
            deviceId: sync ? deviceIdSubquery : writableLegacyDeviceIdSubquery,
            usageDate: entry.date,
            tool: entry.tool,
            model: entry.model,
            inputTokens: entry.input,
            outputTokens: entry.output,
            cacheReadTokens: entry.cacheRead,
            cacheWriteTokens: entry.cacheWrite,
            totalTokens: canonicalTotalTokens(entry),
            estimatedCostMicros: estimateCostMicros(entry),
            accountingVersion: sync?.accountingVersion ?? 1,
            snapshotId: null,
          })),
        )
        .onConflictDoUpdate({
          target: [
            dailyUsage.userId,
            dailyUsage.deviceId,
            dailyUsage.usageDate,
            dailyUsage.tool,
            dailyUsage.model,
            dailyUsage.accountingVersion,
          ],
          set: sync
            ? {
                inputTokens: sql`greatest(${dailyUsage.inputTokens}, excluded.input_tokens)`,
                outputTokens: sql`greatest(${dailyUsage.outputTokens}, excluded.output_tokens)`,
                cacheReadTokens: sql`greatest(${dailyUsage.cacheReadTokens}, excluded.cache_read_tokens)`,
                cacheWriteTokens: sql`greatest(${dailyUsage.cacheWriteTokens}, excluded.cache_write_tokens)`,
                totalTokens: sql`greatest(${dailyUsage.totalTokens}, excluded.total_tokens)`,
                estimatedCostMicros: sql`greatest(${dailyUsage.estimatedCostMicros}, excluded.estimated_cost_micros)`,
                updatedAt: sql`now()`,
              }
            : {
                inputTokens: sql`excluded.input_tokens`,
                outputTokens: sql`excluded.output_tokens`,
                cacheReadTokens: sql`excluded.cache_read_tokens`,
                cacheWriteTokens: sql`excluded.cache_write_tokens`,
                totalTokens: sql`excluded.total_tokens`,
                estimatedCostMicros: sql`excluded.estimated_cost_micros`,
                updatedAt: sql`now()`,
              },
        })
    : null;
  // neon-http has no interactive transaction support; batch is atomic through
  // the underlying Neon HTTP transaction API and requires a non-empty tuple.
  const legacyUploadLock = !sync
    ? db
        .select({
          locked: sql<void>`pg_advisory_xact_lock(hashtextextended(${`${webhook.userId}:${deviceHash}`}, 0))`,
        })
        .from(sql`(select 1) as lock_source`)
    : null;
  const batchQueries: [PgBatchItem, ...PgBatchItem[]] = legacyUploadLock
    ? [
        legacyUploadLock,
        deviceUpsert,
        ...(unattributedCleanup ? [unattributedCleanup] : []),
        ...(usageUpsert ? [usageUpsert] : []),
        webhookUpdate,
      ]
    : [
        deviceUpsert,
        ...(unattributedCleanup ? [unattributedCleanup] : []),
        ...(usageUpsert ? [usageUpsert] : []),
        webhookUpdate,
      ];

  try {
    await db.batch(batchQueries);
  } catch (error) {
    if (!sync && entries.length > 0 && postgresErrorCode(error) === "23502") {
      const [currentDevice] = await db
        .select({
          accountingVersion: devices.accountingVersion,
          hasReceivingSnapshot: sql<boolean>`exists (
            select 1
            from ${usageSnapshots}
            where ${usageSnapshots.userId} = ${webhook.userId}
              and ${usageSnapshots.deviceId} = ${QUALIFIED_DEVICES_ID}
              and ${usageSnapshots.status} = 'receiving'
          )`,
        })
        .from(devices)
        .where(and(eq(devices.userId, webhook.userId), eq(devices.deviceHash, deviceHash)))
        .limit(1);

      if (
        currentDevice &&
        (currentDevice.accountingVersion >= 2 || currentDevice.hasReceivingSnapshot)
      ) {
        return { ok: false, status: 409, error: "upgrade_required" };
      }
    }

    throw error;
  }

  return {
    ok: true,
    status: 200,
    uploaded: entries.length,
    committed: true,
    revision: existingDevice?.snapshotRevision ?? 0,
  };
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
