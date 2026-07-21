import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/neon-http";

import * as dbSchema from "../db/schema";
import { dailyUsage, devices, usageSnapshotRows, webhookTokens } from "../db/schema";
import { hashSecret } from "./security/tokens";
import {
  getLeaderboard,
  getProfile,
  getUsageRows,
  sanitizePublicUser,
  upsertUploadedUsage,
} from "./users";
import type { TokenUsageEntry } from "./types";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  batch: vi.fn(),
}));

vi.mock("../db/client", () => ({
  db: mockDb,
}));

type CapturedSql = {
  params: unknown[];
  columns: string[];
};

function inspectSql(value: unknown, captured: CapturedSql = { params: [], columns: [] }) {
  if (!value || typeof value !== "object") {
    return captured;
  }

  const object = value as {
    constructor?: { name?: string };
    queryChunks?: unknown[];
    value?: unknown;
    name?: unknown;
    table?: unknown;
  };
  const constructorName = object.constructor?.name;

  if (constructorName === "Param") {
    captured.params.push(object.value);
    return captured;
  }

  if (typeof object.name === "string" && object.table) {
    captured.columns.push(object.name);
    return captured;
  }

  for (const chunk of object.queryChunks ?? []) {
    inspectSql(chunk, captured);
  }

  return captured;
}

function mockUsageRowsSelect(rows: unknown[]) {
  const captured: { where?: unknown } = {};
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn((condition: unknown) => {
      captured.where = condition;
      return Promise.resolve(rows);
    }),
  };

  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  mockDb.select.mockReturnValue(query);

  return captured;
}

function mockWebhookSelect(rows: unknown[]) {
  const captured: { where?: unknown } = {};
  const query = {
    from: vi.fn(),
    where: vi.fn((condition: unknown) => {
      captured.where ??= condition;
      return query;
    }),
    limit: vi.fn().mockResolvedValue(rows),
  };

  query.from.mockReturnValue(query);
  mockDb.select.mockReturnValue(query);

  return captured;
}

function mockSelectSequence(...results: unknown[][]) {
  mockDb.select.mockImplementation(() => {
    const result = results.shift() ?? [];
    const query = {
      from: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn().mockResolvedValue(result),
      then: (resolve: (value: unknown[]) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    };

    query.from.mockReturnValue(query);
    query.innerJoin.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    return query;
  });
}

function mockUniversalWriteBuilders() {
  const writes: Array<{
    kind: "insert" | "delete" | "update";
    table: unknown;
    where?: unknown;
  }> = [];
  const makeChain = (write: (typeof writes)[number]) => {
    const chain = {
      values: vi.fn(),
      select: vi.fn(),
      onConflictDoUpdate: vi.fn(),
      onConflictDoNothing: vi.fn(),
      set: vi.fn(),
      where: vi.fn(),
    };
    Object.values(chain).forEach((method) => method.mockReturnValue(chain));
    chain.where.mockImplementation((where: unknown) => {
      write.where = where;
      return chain;
    });
    return chain;
  };

  mockDb.insert.mockImplementation((table: unknown) => {
    const write = { kind: "insert" as const, table };
    writes.push(write);
    return makeChain(write);
  });
  mockDb.delete.mockImplementation((table: unknown) => {
    const write = { kind: "delete" as const, table };
    writes.push(write);
    return makeChain(write);
  });
  mockDb.update.mockImplementation((table: unknown) => {
    const write = { kind: "update" as const, table };
    writes.push(write);
    return makeChain(write);
  });
  mockDb.batch.mockResolvedValue([]);

  return writes;
}

function mockProfileQueries(userRows: unknown[], usageRows: unknown[]) {
  const captured: { userWhere?: unknown; usageWhere?: unknown } = {};
  const userQuery = {
    from: vi.fn(),
    where: vi.fn((condition: unknown) => {
      captured.userWhere = condition;
      return userQuery;
    }),
    limit: vi.fn().mockResolvedValue(userRows),
  };
  const usageQuery = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn((condition: unknown) => {
      captured.usageWhere = condition;
      return usageQuery;
    }),
    orderBy: vi.fn().mockResolvedValue(usageRows),
  };

  userQuery.from.mockReturnValue(userQuery);
  usageQuery.from.mockReturnValue(usageQuery);
  usageQuery.innerJoin.mockReturnValue(usageQuery);
  mockDb.select.mockReturnValueOnce(userQuery).mockReturnValueOnce(usageQuery);

  return captured;
}

type PersistenceQuery = {
  kind: "delete" | "insert" | "update";
  table: unknown;
  values?: Record<string, unknown>;
  conflict?: unknown;
  set?: unknown;
  where?: unknown;
};

function mockBatchPersistenceClient(client: {
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}) {
  const queries: PersistenceQuery[] = [];

  client.insert.mockImplementation((table: unknown) => {
    const query: PersistenceQuery = { kind: "insert", table };
    queries.push(query);

    return {
      values(values: Record<string, unknown>) {
        query.values = values;

        return {
          onConflictDoUpdate(conflict: unknown) {
            query.conflict = conflict;

            return query;
          },
        };
      },
    };
  });

  client.delete.mockImplementation((table: unknown) => {
    const query: PersistenceQuery = { kind: "delete", table };
    queries.push(query);

    return {
      where(where: unknown) {
        query.where = where;
        return query;
      },
    };
  });

  client.update.mockImplementation((table: unknown) => {
    const query: PersistenceQuery = { kind: "update", table };
    queries.push(query);

    return {
      set(set: unknown) {
        query.set = set;

        return {
          where(where: unknown) {
            query.where = where;
            return query;
          },
        };
      },
    };
  });

  return { queries };
}

function collectQueryValues(value: unknown, seen = new WeakSet<object>()): unknown[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value !== "object") {
    return [value];
  }

  if (seen.has(value)) {
    return [];
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectQueryValues(item, seen));
  }

  const object = value as {
    constructor?: { name?: string };
    queryChunks?: unknown[];
    value?: unknown;
    values?: Record<string, unknown>;
    set?: unknown;
    where?: unknown;
  };

  if (object.constructor?.name === "Param") {
    return [object.value];
  }

  if (object.queryChunks) {
    return object.queryChunks.flatMap((chunk) => collectQueryValues(chunk, seen));
  }

  if (object.constructor?.name === "Object") {
    return Object.values(object).flatMap((item) => collectQueryValues(item, seen));
  }

  return [
    ...collectQueryValues(object.values, seen),
    ...collectQueryValues(object.set, seen),
    ...collectQueryValues(object.where, seen),
  ];
}

const uploadEntry = {
  date: "2026-06-23",
  tool: "codex",
  model: "gpt-5.5",
  input: 100,
  output: 50,
  cacheRead: 20,
  cacheWrite: 10,
  total: 150,
} satisfies TokenUsageEntry;

beforeEach(() => {
  mockDb.select.mockReset();
  mockDb.insert.mockReset();
  mockDb.delete.mockReset();
  mockDb.update.mockReset();
  mockDb.execute.mockReset();
  mockDb.transaction.mockReset();
  mockDb.batch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("sanitizePublicUser", () => {
  it("returns public profile fields without private auth fields", () => {
    const user = sanitizePublicUser({
      id: "user-1",
      name: "Private Auth Name",
      email: "alice@example.com",
      emailVerified: new Date("2026-06-22T00:00:00.000Z"),
      image: "https://example.com/private.jpg",
      xId: "123456",
      xHandle: "alice",
      displayName: "Alice Public",
      avatarUrl: "https://example.com/avatar.jpg",
      profilePublic: true,
      rankingEnabled: true,
      createdAt: new Date("2026-06-22T00:00:00.000Z"),
      updatedAt: new Date("2026-06-22T00:00:00.000Z"),
    });

    expect(user).toEqual({
      id: "user-1",
      handle: "alice",
      name: "Alice Public",
      avatarUrl: "https://example.com/avatar.jpg",
      profilePublic: true,
      rankingEnabled: true,
    });
    expect(user).not.toHaveProperty("email");
    expect(user).not.toHaveProperty("emailVerified");
  });
});

describe("getUsageRows", () => {
  it("retries transient database fetch failures without hiding query errors", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T19:15:00.000Z"));

    const transientError = Object.assign(new Error("Failed query"), {
      cause: new Error("Error connecting to database: fetch failed"),
    });
    const query = {
      from: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn().mockRejectedValueOnce(transientError).mockResolvedValueOnce([]),
    };
    query.from.mockReturnValue(query);
    query.innerJoin.mockReturnValue(query);
    mockDb.select.mockReturnValue(query);

    const rowsPromise = getUsageRows("today");
    await vi.advanceTimersByTimeAsync(300);

    await expect(rowsPromise).resolves.toEqual([]);
    expect(query.where).toHaveBeenCalledTimes(2);
  });

  it("filters rankings by enabled users, unblocked devices, unblocked rows, and date bounds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T19:15:00.000Z"));

    const captured = mockUsageRowsSelect([
      {
        userId: "user-1",
        handle: null,
        name: null,
        avatarUrl: null,
        deviceId: "device-1",
        date: "2026-06-23",
        tool: "codex",
        model: "gpt-5.5",
        inputTokens: 1,
        outputTokens: 2,
        cacheReadTokens: 3,
        cacheWriteTokens: 4,
        totalTokens: 10,
        estimatedCostMicros: 50,
        blocked: false,
      },
    ]);

    const rows = await getUsageRows("7d");
    const sql = inspectSql(captured.where);

    expect(sql.params).toEqual(expect.arrayContaining([true, "2026-06-17", "2026-06-23"]));
    expect(sql.params.filter((param) => param === false)).toHaveLength(2);
    expect(sql.columns).toEqual(
      expect.arrayContaining(["ranking_enabled", "blocked", "usage_date"]),
    );
    expect(sql.columns.filter((column) => column === "usage_date")).toHaveLength(4);
    expect(sql.columns.filter((column) => column === "blocked")).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      handle: "unknown",
      name: "Unknown",
    });
  });

  it("excludes reserved demo users from the public data path by default", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T19:15:00.000Z"));
    vi.stubEnv("TOKENRANK_SHOW_DEMO_DATA", "");

    mockUsageRowsSelect(
      ["demo_alice", "user-1"].map((userId) => ({
        userId,
        handle: userId,
        name: userId,
        avatarUrl: null,
        deviceId: `device-${userId}`,
        date: "2026-06-23",
        tool: "codex",
        model: "gpt-5.5",
        inputTokens: 10,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalTokens: 10,
        estimatedCostMicros: 1,
        blocked: false,
      })),
    );

    await expect(getUsageRows("today")).resolves.toEqual([
      expect.objectContaining({ userId: "user-1" }),
    ]);
  });
});

describe("getLeaderboard", () => {
  it("caps public leaderboard responses to the top 100 entries", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T19:15:00.000Z"));

    mockUsageRowsSelect(
      Array.from({ length: 101 }, (_, index) => ({
        userId: `user-${index}`,
        handle: `user${index}`,
        name: `User ${index}`,
        avatarUrl: null,
        deviceId: `device-${index}`,
        date: "2026-06-23",
        tool: "codex",
        model: "gpt-5.5",
        inputTokens: index + 1,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalTokens: index + 1,
        estimatedCostMicros: index + 1,
        blocked: false,
      })),
    );

    const entries = await getLeaderboard("total", "today");

    expect(entries).toHaveLength(100);
    expect(entries[0]).toMatchObject({ userId: "user-100", rank: 1, score: 101 });
    expect(entries.at(-1)).toMatchObject({ rank: 100, score: 2 });
  });
});

describe("getProfile", () => {
  it("returns sanitized public user data and filters blocked public usage", async () => {
    const captured = mockProfileQueries(
      [
        {
          id: "user-1",
          name: "Private Auth Name",
          email: "alice@example.com",
          emailVerified: new Date("2026-06-22T00:00:00.000Z"),
          image: "https://example.com/private.jpg",
          xId: "123456",
          xHandle: "alice",
          displayName: "Alice Public",
          avatarUrl: "https://example.com/avatar.jpg",
          profilePublic: true,
          rankingEnabled: true,
          createdAt: new Date("2026-06-22T00:00:00.000Z"),
          updatedAt: new Date("2026-06-22T00:00:00.000Z"),
        },
      ],
      [
        {
          id: "usage-1",
          usageDate: "2026-06-23",
          tool: "codex",
          model: "gpt-5.5",
          inputTokens: 1,
          outputTokens: 2,
          cacheReadTokens: 3,
          cacheWriteTokens: 4,
          totalTokens: 10,
          estimatedCostMicros: 50,
          blocked: false,
          updatedAt: new Date("2026-06-23T00:00:00.000Z"),
        },
      ],
    );

    const profile = await getProfile("@Alice");
    const usageSql = inspectSql(captured.usageWhere);

    expect(profile?.user).toEqual({
      id: "user-1",
      handle: "alice",
      name: "Alice Public",
      avatarUrl: "https://example.com/avatar.jpg",
      profilePublic: true,
      rankingEnabled: true,
    });
    expect(profile?.user).not.toHaveProperty("email");
    expect(profile?.user).not.toHaveProperty("emailVerified");
    expect(profile?.daily).toHaveLength(1);
    expect(usageSql.params).toEqual(expect.arrayContaining(["user-1"]));
    expect(usageSql.params.filter((param) => param === false)).toHaveLength(2);
    expect(usageSql.columns.filter((column) => column === "blocked")).toHaveLength(2);
  });

  it("does not publish a reserved demo profile by default", async () => {
    vi.stubEnv("TOKENRANK_SHOW_DEMO_DATA", "");
    const userQuery = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn().mockResolvedValue([{ id: "demo_alice", profilePublic: true }]),
    };
    userQuery.from.mockReturnValue(userQuery);
    userQuery.where.mockReturnValue(userQuery);
    mockDb.select.mockReturnValue(userQuery);

    await expect(getProfile("alice_ai")).resolves.toBeNull();
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });
});

describe("upsertUploadedUsage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T12:00:00.000Z"));
  });

  it("rejects incremental v2 uploads until the cutover snapshot commits", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 1, cutoverDate: null, snapshotRevision: 0 }],
    );

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [], {
        accountingVersion: 2,
        syncMode: "incremental",
      }),
    ).resolves.toEqual({ ok: false, status: 409, error: "cutover_required" });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("returns the committed cutover so a device can recover lost local state", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 2, cutoverDate: "2026-06-23", snapshotRevision: 4 }],
    );

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [], {
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "snapshot_20260716_recovery",
        cutoverDate: "2026-07-16",
        batchHash: "a".repeat(64),
        batchIndex: 0,
        batchCount: 1,
      }),
    ).resolves.toEqual({
      ok: false,
      status: 409,
      error: "cutover_date_conflict",
      expectedCutoverDate: "2026-06-23",
      revision: 4,
    });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("uses the server UTC day for a device's first cutover", async () => {
    mockSelectSequence([{ id: "webhook-row-id", userId: "user-1" }], []);

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [], {
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "550e8400-e29b-41d4-a716-446655440000",
        cutoverDate: "2026-07-16",
        batchHash: "a".repeat(64),
        batchIndex: 0,
        batchCount: 1,
      }),
    ).resolves.toEqual({
      ok: false,
      status: 409,
      error: "cutover_date_conflict",
      expectedCutoverDate: "2026-06-23",
      revision: 0,
    });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("upserts incremental v2 high-water rows without destructive cleanup", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 2, cutoverDate: "2026-06-23", snapshotRevision: 4 }],
    );
    const writes = mockUniversalWriteBuilders();

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry], {
      accountingVersion: 2,
      syncMode: "incremental",
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      uploaded: 1,
      committed: true,
      revision: 4,
    });
    expect(writes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "insert", table: dailyUsage })]),
    );
    expect(writes.some((write) => write.kind === "delete" && write.table === dailyUsage)).toBe(
      false,
    );
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
  });

  it("rejects legacy uploads after a device has committed v2 cutover", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 2, cutoverDate: "2026-07-15", snapshotRevision: 1 }],
    );

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", []),
    ).resolves.toEqual({ ok: false, status: 409, error: "upgrade_required" });
  });

  it("bounds persistent device state per account", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [],
      [{ count: 16 }],
    );

    await expect(
      upsertUploadedUsage("raw-token", "new-device-id", [uploadEntry]),
    ).resolves.toEqual({ ok: false, status: 409, error: "device_limit" });
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("rejects legacy uploads as soon as a v2 cutover snapshot starts receiving", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [
        {
          accountingVersion: 1,
          cutoverDate: null,
          snapshotRevision: 0,
          hasReceivingSnapshot: true,
        },
      ],
    );
    mockUniversalWriteBuilders();

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry]),
    ).resolves.toEqual({ ok: false, status: 409, error: "upgrade_required" });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("qualifies the receiving snapshot correlation against the outer device row", async () => {
    const realDb = drizzle.mock({ schema: dbSchema });
    let selectCall = 0;
    let existingDeviceFields: Parameters<typeof realDb.select>[0] | undefined;

    mockDb.select.mockImplementation((fields: Parameters<typeof realDb.select>[0]) => {
      selectCall += 1;
      const rows =
        selectCall === 1
          ? [{ id: "webhook-row-id", userId: "user-1" }]
          : [
              {
                accountingVersion: 1,
                cutoverDate: null,
                snapshotRevision: 0,
                receivingCutoverDate: "2026-06-23",
                hasReceivingSnapshot: true,
              },
            ];

      if (selectCall === 2) {
        existingDeviceFields = fields;
      }

      const query = {
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn().mockResolvedValue(rows),
      };
      query.from.mockReturnValue(query);
      query.where.mockReturnValue(query);
      return query;
    });

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry]),
    ).resolves.toEqual({ ok: false, status: 409, error: "upgrade_required" });

    expect(existingDeviceFields).toBeDefined();
    const query = realDb.select(existingDeviceFields!).from(devices).toSQL();
    expect(query.sql).toContain('"device_id" = "devices"."id"');
    expect(query.sql).not.toContain('"device_id" = "id"');
  });

  it("fails closed when a cutover starts while a legacy upload waits for the device lock", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [
        {
          accountingVersion: 1,
          cutoverDate: null,
          snapshotRevision: 0,
          hasReceivingSnapshot: false,
        },
      ],
      [],
      [{ accountingVersion: 1, hasReceivingSnapshot: true }],
    );
    mockUniversalWriteBuilders();
    mockDb.batch.mockRejectedValue(Object.assign(new Error("null guarded device"), { code: "23502" }));

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry]),
    ).resolves.toEqual({ ok: false, status: 409, error: "upgrade_required" });
  });

  it("keeps an incomplete multi-batch cutover entirely in staging", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 1, cutoverDate: null, snapshotRevision: 0 }],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [
        {
          batchHash: "a".repeat(64),
          revision: 1,
          batchCount: 2,
          cutoverDate: "2026-06-23",
          status: "receiving",
        },
      ],
      [{ batchIndex: 0 }],
    );
    const writes = mockUniversalWriteBuilders();

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry], {
      accountingVersion: 2,
      syncMode: "full",
      snapshotId: "snapshot_20260716_020000",
      cutoverDate: "2026-06-23",
      batchHash: "a".repeat(64),
      batchIndex: 0,
      batchCount: 2,
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      uploaded: 1,
      committed: false,
      revision: 1,
    });
    expect(writes.some((write) => write.table === dailyUsage)).toBe(false);
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
  });

  it("returns the active snapshot identity so token rotation can resume it", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 1, cutoverDate: null, snapshotRevision: 0 }],
      [],
      [
        {
          snapshotId: "550e8400-e29b-41d4-a716-446655440000",
          revision: 1,
          cutoverDate: "2026-06-23",
          createdAt: new Date(),
        },
      ],
    );
    mockUniversalWriteBuilders();

    await expect(
      upsertUploadedUsage("rotated-token", "raw-device-id", [uploadEntry], {
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "9f1c4a42-1d54-4698-8f91-82f75ad379fb",
        cutoverDate: "2026-06-23",
        batchHash: "a".repeat(64),
        batchIndex: 0,
        batchCount: 1,
      }),
    ).resolves.toEqual({
      ok: false,
      status: 409,
      error: "active_snapshot_conflict",
      activeSnapshotId: "550e8400-e29b-41d4-a716-446655440000",
      expectedCutoverDate: "2026-06-23",
      revision: 1,
    });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("atomically commits an empty initial cutover snapshot", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 1, cutoverDate: null, snapshotRevision: 0 }],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [
        {
          batchHash: "a".repeat(64),
          revision: 1,
          batchCount: 1,
          cutoverDate: "2026-06-23",
          status: "receiving",
        },
      ],
      [{ batchIndex: 0 }],
      [{ stagedRowCount: 0, declaredRowCount: 0 }],
      [],
      [],
      [],
      [{ revision: 1, status: "committed" }],
    );
    const writes = mockUniversalWriteBuilders();

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [], {
      accountingVersion: 2,
      syncMode: "full",
      snapshotId: "snapshot_20260716_020000",
      cutoverDate: "2026-06-23",
      batchHash: "a".repeat(64),
      batchIndex: 0,
      batchCount: 1,
    });

    expect(result).toMatchObject({ committed: true, revision: 1 });
    expect(writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "delete", table: dailyUsage }),
        expect.objectContaining({ kind: "insert", table: dailyUsage }),
      ]),
    );
    expect(
      writes.filter((write) => write.kind === "insert" && write.table === usageSnapshotRows),
    ).toHaveLength(2);
    const preservedBlockedRows = writes.find(
      (write) => write.kind === "update" && write.table === dailyUsage,
    );
    const clearedUnblockedRows = writes.find(
      (write) => write.kind === "delete" && write.table === dailyUsage,
    );
    expect(inspectSql(preservedBlockedRows?.where).columns).toContain("blocked");
    expect(inspectSql(preservedBlockedRows?.where).columns).toContain("daily_usage_id");
    expect(inspectSql(preservedBlockedRows?.where).params).toContain(true);
    expect(inspectSql(clearedUnblockedRows?.where).columns).toContain("blocked");
    expect(inspectSql(clearedUnblockedRows?.where).columns).toContain("daily_usage_id");
    expect(inspectSql(clearedUnblockedRows?.where).params).toContain(false);
    expect(mockDb.batch).toHaveBeenCalledTimes(2);
  });

  it("guards cutover cleanup so later reconciliation never infers deletion", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 2, cutoverDate: "2026-06-23", snapshotRevision: 1 }],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [
        {
          batchHash: "a".repeat(64),
          revision: 2,
          batchCount: 1,
          cutoverDate: "2026-06-23",
          status: "receiving",
        },
      ],
      [{ batchIndex: 0 }],
      [{ stagedRowCount: 0, declaredRowCount: 0 }],
      [],
      [],
      [],
      [{ revision: 2, status: "committed" }],
    );
    const writes = mockUniversalWriteBuilders();

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [], {
      accountingVersion: 2,
      syncMode: "full",
      snapshotId: "snapshot_20260716_030000",
      cutoverDate: "2026-06-23",
      batchHash: "a".repeat(64),
      batchIndex: 0,
      batchCount: 1,
    });

    expect(result).toMatchObject({ committed: true, revision: 2 });
    const guardedCutoverCleanup = writes.find(
      (write) => write.kind === "delete" && write.table === dailyUsage,
    );
    expect(guardedCutoverCleanup).toBeDefined();
    expect(inspectSql(guardedCutoverCleanup?.where).columns).toEqual(
      expect.arrayContaining(["usage_date", "cutover_date"]),
    );
  });

  it("rejects a complete snapshot whose staged row count is incomplete", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 1, cutoverDate: null, snapshotRevision: 0 }],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [
        {
          batchHash: "a".repeat(64),
          revision: 1,
          batchCount: 1,
          cutoverDate: "2026-06-23",
          status: "receiving",
        },
      ],
      [{ batchIndex: 0 }],
      [{ stagedRowCount: 0, declaredRowCount: 1 }],
    );
    mockUniversalWriteBuilders();

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [], {
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "snapshot_20260716_040000",
        cutoverDate: "2026-06-23",
        batchHash: "a".repeat(64),
        batchIndex: 0,
        batchCount: 1,
      }),
    ).resolves.toEqual({ ok: false, status: 409, error: "snapshot_conflict" });
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
  });

  it("accepts a snapshot committed concurrently after its batch was staged", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 2, cutoverDate: "2026-06-23", snapshotRevision: 1 }],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [
        {
          batchHash: "a".repeat(64),
          revision: 2,
          batchCount: 1,
          cutoverDate: "2026-06-23",
          status: "committed",
        },
      ],
    );
    mockUniversalWriteBuilders();

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry], {
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "snapshot_20260716_050000",
        cutoverDate: "2026-06-23",
        batchHash: "a".repeat(64),
        batchIndex: 0,
        batchCount: 1,
      }),
    ).resolves.toEqual({
      ok: true,
      status: 200,
      uploaded: 1,
      committed: true,
      revision: 2,
    });
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
  });

  it("rejects a repeated snapshot batch whose hash changed", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 1, cutoverDate: null, snapshotRevision: 0 }],
      [
        {
          id: "snapshot-row-id",
          revision: 1,
          batchCount: 2,
          cutoverDate: "2026-06-23",
          status: "receiving",
        },
      ],
      [{ id: "snapshot-row-id", snapshotId: "snapshot_20260716_020000", createdAt: new Date() }],
      [{ batchHash: "b".repeat(64) }],
    );
    mockUniversalWriteBuilders();

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry], {
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "snapshot_20260716_020000",
        cutoverDate: "2026-06-23",
        batchHash: "a".repeat(64),
        batchIndex: 0,
        batchCount: 2,
      }),
    ).resolves.toEqual({ ok: false, status: 409, error: "snapshot_conflict" });
  });

  it("treats a repeated batch for a committed snapshot as idempotent", async () => {
    mockSelectSequence(
      [{ id: "webhook-row-id", userId: "user-1" }],
      [{ accountingVersion: 2, cutoverDate: "2026-06-23", snapshotRevision: 1 }],
      [
        {
          id: "snapshot-row-id",
          revision: 1,
          batchCount: 1,
          cutoverDate: "2026-06-23",
          status: "committed",
        },
      ],
      [],
      [{ batchHash: "a".repeat(64) }],
    );
    mockUniversalWriteBuilders();

    await expect(
      upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry], {
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "snapshot_20260716_020000",
        cutoverDate: "2026-06-23",
        batchHash: "a".repeat(64),
        batchIndex: 0,
        batchCount: 1,
      }),
    ).resolves.toEqual({
      ok: true,
      status: 200,
      uploaded: 1,
      committed: true,
      revision: 1,
    });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid webhook tokens without inserting usage", async () => {
    const captured = mockWebhookSelect([]);

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry]);
    const sql = inspectSql(captured.where);

    expect(result).toEqual({ ok: false, status: 401 });
    expect(sql.params).toContain(hashSecret("raw-token"));
    expect(sql.params).not.toContain("raw-token");
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.delete).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("persists valid uploads atomically with batched queries and hashed IDs", async () => {
    const captured = mockWebhookSelect([{ id: "webhook-row-id", userId: "user-1" }]);
    const persistence = mockBatchPersistenceClient(mockDb);
    mockDb.batch.mockResolvedValue([]);

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry]);
    const sql = inspectSql(captured.where);
    const batchedQueries = mockDb.batch.mock.calls[0]?.[0] as PersistenceQuery[] | undefined;
    const deviceInsert = persistence.queries.find((query) => query.table === devices);
    const usageInsert = persistence.queries.find(
      (query) => query.kind === "insert" && query.table === dailyUsage,
    );
    const unattributedCleanup = persistence.queries.find(
      (query) => query.kind === "delete" && query.table === dailyUsage,
    );
    const webhookUpdate = persistence.queries.find(
      (query) => query.kind === "update" && query.table === webhookTokens,
    );
    const batchValues = collectQueryValues(batchedQueries);
    const usageInsertValues = collectQueryValues(usageInsert?.values);

    expect(result).toEqual({
      ok: true,
      status: 200,
      uploaded: 1,
      committed: true,
      revision: 0,
    });
    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
    expect(batchedQueries?.slice(1)).toEqual([
      deviceInsert,
      unattributedCleanup,
      usageInsert,
      webhookUpdate,
    ]);
    expect(batchedQueries).toHaveLength(5);
    expect(sql.params).toContain(hashSecret("raw-token"));
    expect(sql.params).not.toContain("raw-token");
    expect(deviceInsert?.values).toMatchObject({
      userId: "user-1",
      deviceHash: hashSecret("raw-device-id"),
      label: "Local device",
    });
    expect(deviceInsert?.values).not.toMatchObject({ deviceHash: "raw-device-id" });
    expect(usageInsertValues).toEqual(
      expect.arrayContaining(["user-1", hashSecret("raw-device-id")]),
    );
    expect(usageInsert?.values).toEqual([
      expect.objectContaining({
        userId: "user-1",
        usageDate: "2026-06-23",
        totalTokens: 150,
      }),
    ]);
    expect(batchValues).toContain(hashSecret("raw-device-id"));
    expect(batchValues).toContain("codex-unattributed");
    expect(batchValues).not.toContain("raw-device-id");
    expect(batchValues).not.toContain("raw-token");
  });

  it("bubbles batch persistence errors", async () => {
    mockWebhookSelect([{ id: "webhook-row-id", userId: "user-1" }]);
    mockBatchPersistenceClient(mockDb);
    mockDb.batch.mockRejectedValue(new Error("batch failed"));

    await expect(upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry])).rejects.toThrow(
      "batch failed",
    );
  });

  it("builds full snapshot staging with real Drizzle insert-select queries", async () => {
    type RunnableSql = {
      _prepare: () => unknown;
      toSQL: () => { sql: string; params: unknown[] };
    };

    const realDb = drizzle.mock({ schema: dbSchema });
    const realSelect = Symbol("real-select");
    const selectResults: Array<unknown[] | typeof realSelect> = [
      [{ id: "webhook-row-id", userId: "user-1" }],
      [
        {
          accountingVersion: 1,
          cutoverDate: null,
          snapshotRevision: 0,
          receivingCutoverDate: null,
          hasReceivingSnapshot: false,
        },
      ],
      [],
      [],
      [],
      realSelect,
      realSelect,
      realSelect,
      realSelect,
      [
        {
          batchHash: "a".repeat(64),
          revision: 1,
          batchCount: 2,
          cutoverDate: "2026-06-23",
          status: "receiving",
        },
      ],
      [{ batchIndex: 0 }],
    ];

    mockDb.select.mockImplementation((fields: Parameters<typeof realDb.select>[0]) => {
      const result = selectResults.shift();

      if (result === realSelect) {
        return realDb.select(fields);
      }

      const rows = result ?? [];
      const query = {
        from: vi.fn(),
        innerJoin: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn().mockResolvedValue(rows),
        then: (resolve: (value: unknown[]) => unknown, reject: (error: unknown) => unknown) =>
          Promise.resolve(rows).then(resolve, reject),
      };
      query.from.mockReturnValue(query);
      query.innerJoin.mockReturnValue(query);
      query.where.mockReturnValue(query);
      query.orderBy.mockReturnValue(query);
      return query;
    });
    mockDb.insert.mockImplementation((table: Parameters<typeof realDb.insert>[0]) =>
      realDb.insert(table),
    );
    mockDb.delete.mockImplementation((table: Parameters<typeof realDb.delete>[0]) =>
      realDb.delete(table),
    );
    mockDb.update.mockImplementation((table: Parameters<typeof realDb.update>[0]) =>
      realDb.update(table),
    );
    mockDb.batch.mockResolvedValue([]);

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry], {
      accountingVersion: 2,
      syncMode: "full",
      snapshotId: "snapshot_20260716_real_builder",
      cutoverDate: "2026-06-23",
      batchHash: "a".repeat(64),
      batchIndex: 0,
      batchCount: 2,
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      uploaded: 1,
      committed: false,
      revision: 1,
    });
    expect(selectResults).toHaveLength(0);

    const queries = mockDb.batch.mock.calls[0]?.[0] as RunnableSql[];
    const builtQueries = queries.map((query) => query.toSQL());

    expect(queries).toHaveLength(7);
    expect(queries.every((query) => typeof query._prepare === "function")).toBe(true);
    expect(builtQueries[3].sql).toContain('insert into "usage_snapshots"');
    expect(builtQueries[4].sql).toContain('insert into "usage_snapshot_batches"');
    expect(builtQueries[5].sql).toContain('insert into "usage_snapshot_rows"');
  });

  it("builds full snapshot commit with complete real Drizzle insert-select queries", async () => {
    type RunnableSql = {
      _prepare: () => unknown;
      toSQL: () => { sql: string; params: unknown[] };
    };

    const realDb = drizzle.mock({ schema: dbSchema });
    const realSelect = Symbol("real-select");
    const selectResults: Array<unknown[] | typeof realSelect> = [
      [{ id: "webhook-row-id", userId: "user-1" }],
      [
        {
          accountingVersion: 1,
          cutoverDate: null,
          snapshotRevision: 0,
          receivingCutoverDate: null,
          hasReceivingSnapshot: false,
        },
      ],
      [],
      [],
      [],
      realSelect,
      realSelect,
      realSelect,
      realSelect,
      [
        {
          batchHash: "a".repeat(64),
          revision: 1,
          batchCount: 1,
          cutoverDate: "2026-06-23",
          status: "receiving",
        },
      ],
      [{ batchIndex: 0 }],
      [{ stagedRowCount: 1, declaredRowCount: 1 }],
      realSelect,
      realSelect,
      realSelect,
      [{ revision: 1, status: "committed" }],
    ];

    mockDb.select.mockImplementation((fields: Parameters<typeof realDb.select>[0]) => {
      const result = selectResults.shift();

      if (result === realSelect) {
        return realDb.select(fields);
      }

      const rows = result ?? [];
      const query = {
        from: vi.fn(),
        innerJoin: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn().mockResolvedValue(rows),
        then: (resolve: (value: unknown[]) => unknown, reject: (error: unknown) => unknown) =>
          Promise.resolve(rows).then(resolve, reject),
      };
      query.from.mockReturnValue(query);
      query.innerJoin.mockReturnValue(query);
      query.where.mockReturnValue(query);
      query.orderBy.mockReturnValue(query);
      return query;
    });
    mockDb.insert.mockImplementation((table: Parameters<typeof realDb.insert>[0]) =>
      realDb.insert(table),
    );
    mockDb.delete.mockImplementation((table: Parameters<typeof realDb.delete>[0]) =>
      realDb.delete(table),
    );
    mockDb.update.mockImplementation((table: Parameters<typeof realDb.update>[0]) =>
      realDb.update(table),
    );
    mockDb.batch.mockResolvedValue([]);

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry], {
      accountingVersion: 2,
      syncMode: "full",
      snapshotId: "snapshot_20260716_real_commit",
      cutoverDate: "2026-06-23",
      batchHash: "a".repeat(64),
      batchIndex: 0,
      batchCount: 1,
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      uploaded: 1,
      committed: true,
      revision: 1,
    });
    expect(selectResults).toHaveLength(0);
    expect(mockDb.batch).toHaveBeenCalledTimes(2);

    const stageQueries = mockDb.batch.mock.calls[0]?.[0] as RunnableSql[];
    const commitQueries = mockDb.batch.mock.calls[1]?.[0] as RunnableSql[];
    const builtStageQueries = stageQueries.map((query) => query.toSQL());
    const builtCommitQueries = commitQueries.map((query) => query.toSQL());

    expect(stageQueries).toHaveLength(7);
    expect(commitQueries).toHaveLength(10);
    expect(builtStageQueries[3].sql).toContain('insert into "usage_snapshots"');
    expect(builtCommitQueries[1].sql).toContain('insert into "usage_snapshot_rows"');
    expect(builtCommitQueries[4].sql).toContain('insert into "daily_usage"');
    expect(builtCommitQueries[1].sql).toContain(
      '"anomaly_flags"."daily_usage_id" = "daily_usage"."id"',
    );
    expect(builtCommitQueries[2].sql).toContain(
      '"anomaly_flags"."daily_usage_id" = "daily_usage"."id"',
    );
  });

  it("passes real Drizzle runnable query builders to upload batch", async () => {
    type RunnableSql = {
      _prepare: () => unknown;
      toSQL: () => { sql: string; params: unknown[] };
    };

    const realDb = drizzle.mock({ schema: dbSchema });

    const selectResults: unknown[][] = [
      [{ id: "webhook-row-id", userId: "user-1" }],
      [
        {
          accountingVersion: 1,
          cutoverDate: null,
          snapshotRevision: 0,
          hasReceivingSnapshot: false,
        },
      ],
    ];
    mockDb.select.mockImplementation((fields: Parameters<typeof realDb.select>[0]) => {
      if (selectResults.length === 0) {
        return realDb.select(fields);
      }

      const result = selectResults.shift() ?? [];
      const query = {
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn().mockResolvedValue(result),
      };
      query.from.mockReturnValue(query);
      query.where.mockReturnValue(query);
      return query;
    });

    mockDb.insert.mockImplementation((table: Parameters<typeof realDb.insert>[0]) =>
      realDb.insert(table),
    );
    mockDb.delete.mockImplementation((table: Parameters<typeof realDb.delete>[0]) =>
      realDb.delete(table),
    );
    mockDb.update.mockImplementation((table: Parameters<typeof realDb.update>[0]) =>
      realDb.update(table),
    );
    mockDb.batch.mockResolvedValue([]);

    await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry]);

    const queries = mockDb.batch.mock.calls[0]?.[0] as RunnableSql[];
    const builtQueries = queries.map((query) => query.toSQL());
    const allParams = builtQueries.flatMap((query) => query.params);

    expect(queries).toHaveLength(5);
    expect(queries.every((query) => typeof query._prepare === "function")).toBe(true);
    expect(builtQueries[0].sql).toContain("pg_advisory_xact_lock");
    expect(builtQueries[1].sql).toContain('insert into "devices"');
    expect(builtQueries[2].sql).toContain('delete from "daily_usage"');
    expect(builtQueries[3].sql).toContain('select "devices"."id"');
    expect(builtQueries[3].sql).toContain('"accounting_version"');
    expect(builtQueries[4].sql).toContain('update "webhook_tokens"');
    expect(allParams).toContain(hashSecret("raw-device-id"));
    expect(allParams).not.toContain("raw-device-id");
    expect(allParams).not.toContain("raw-token");
  });
});
