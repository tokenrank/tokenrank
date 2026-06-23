import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/neon-http";

import * as dbSchema from "../db/schema";
import { dailyUsage, devices } from "../db/schema";
import { hashSecret } from "./security/tokens";
import { getProfile, getUsageRows, sanitizePublicUser, upsertUploadedUsage } from "./users";
import type { TokenUsageEntry } from "./types";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
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
      captured.where = condition;
      return query;
    }),
    limit: vi.fn().mockResolvedValue(rows),
  };

  query.from.mockReturnValue(query);
  mockDb.select.mockReturnValue(query);

  return captured;
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
  kind: "insert" | "update";
  table: unknown;
  values?: Record<string, unknown>;
  conflict?: unknown;
  set?: unknown;
  where?: unknown;
};

function mockBatchPersistenceClient(client: {
  insert: ReturnType<typeof vi.fn>;
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
  total: 180,
} satisfies TokenUsageEntry;

beforeEach(() => {
  mockDb.select.mockReset();
  mockDb.insert.mockReset();
  mockDb.update.mockReset();
  mockDb.transaction.mockReset();
  mockDb.batch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
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
    expect(sql.columns.filter((column) => column === "usage_date")).toHaveLength(2);
    expect(sql.columns.filter((column) => column === "blocked")).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      handle: "unknown",
      name: "Unknown",
    });
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
});

describe("upsertUploadedUsage", () => {
  it("returns 401 for invalid webhook tokens without inserting usage", async () => {
    const captured = mockWebhookSelect([]);

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry]);
    const sql = inspectSql(captured.where);

    expect(result).toEqual({ ok: false, status: 401 });
    expect(sql.params).toContain(hashSecret("raw-token"));
    expect(sql.params).not.toContain("raw-token");
    expect(mockDb.insert).not.toHaveBeenCalled();
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
    const usageInsert = persistence.queries.find((query) => query.table === dailyUsage);
    const batchValues = collectQueryValues(batchedQueries);
    const usageDeviceIdSqlValues = collectQueryValues(usageInsert?.values?.deviceId);

    expect(result).toEqual({ ok: true, status: 200, uploaded: 1 });
    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
    expect(batchedQueries).toEqual(persistence.queries);
    expect(batchedQueries).toHaveLength(3);
    expect(sql.params).toContain(hashSecret("raw-token"));
    expect(sql.params).not.toContain("raw-token");
    expect(deviceInsert?.values).toMatchObject({
      userId: "user-1",
      deviceHash: hashSecret("raw-device-id"),
      label: "Local device",
    });
    expect(deviceInsert?.values).not.toMatchObject({ deviceHash: "raw-device-id" });
    expect(usageDeviceIdSqlValues).toEqual(
      expect.arrayContaining(["user-1", hashSecret("raw-device-id")]),
    );
    expect(usageInsert?.values).toMatchObject({
      userId: "user-1",
      usageDate: "2026-06-23",
    });
    expect(batchValues).toContain(hashSecret("raw-device-id"));
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

  it("passes real Drizzle runnable query builders to upload batch", async () => {
    type RunnableSql = {
      _prepare: () => unknown;
      toSQL: () => { sql: string; params: unknown[] };
    };

    mockWebhookSelect([{ id: "webhook-row-id", userId: "user-1" }]);

    const realDb = drizzle.mock({ schema: dbSchema });

    mockDb.insert.mockImplementation((table: Parameters<typeof realDb.insert>[0]) =>
      realDb.insert(table),
    );
    mockDb.update.mockImplementation((table: Parameters<typeof realDb.update>[0]) =>
      realDb.update(table),
    );
    mockDb.batch.mockResolvedValue([]);

    await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry]);

    const queries = mockDb.batch.mock.calls[0]?.[0] as RunnableSql[];
    const builtQueries = queries.map((query) => query.toSQL());
    const allParams = builtQueries.flatMap((query) => query.params);

    expect(queries).toHaveLength(3);
    expect(queries.every((query) => typeof query._prepare === "function")).toBe(true);
    expect(builtQueries[0].sql).toContain('insert into "devices"');
    expect(builtQueries[1].sql).toContain('select "devices"."id"');
    expect(builtQueries[2].sql).toContain('update "webhook_tokens"');
    expect(allParams).toContain(hashSecret("raw-device-id"));
    expect(allParams).not.toContain("raw-device-id");
    expect(allParams).not.toContain("raw-token");
  });
});
