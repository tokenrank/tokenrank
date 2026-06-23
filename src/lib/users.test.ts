import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dailyUsage, devices } from "../db/schema";
import { hashSecret } from "./security/tokens";
import { getUsageRows, sanitizePublicUser, upsertUploadedUsage } from "./users";
import type { TokenUsageEntry } from "./types";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
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

function mockInsertAndUpdate() {
  const inserts: Array<{ table: unknown; values?: unknown; conflict?: unknown }> = [];

  mockDb.insert.mockImplementation((table: unknown) => {
    const record: { table: unknown; values?: unknown; conflict?: unknown } = { table };
    inserts.push(record);

    return {
      values(values: unknown) {
        record.values = values;

        return {
          onConflictDoUpdate(conflict: unknown) {
            record.conflict = conflict;

            if (table === devices) {
              return {
                returning: vi.fn().mockResolvedValue([{ id: "device-row-id" }]),
              };
            }

            return Promise.resolve();
          },
        };
      },
    };
  });

  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  mockDb.update.mockReturnValue({ set: updateSet });

  return { inserts, updateSet, updateWhere };
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
  it("filters rankings by enabled users, unblocked devices, and inclusive UTC date bounds", async () => {
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

    expect(sql.params).toEqual(expect.arrayContaining([true, false, "2026-06-17", "2026-06-23"]));
    expect(sql.columns).toEqual(
      expect.arrayContaining(["ranking_enabled", "blocked", "usage_date"]),
    );
    expect(sql.columns.filter((column) => column === "usage_date")).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      handle: "unknown",
      name: "Unknown",
    });
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
  });

  it("hashes webhook tokens and device IDs on the valid upload path", async () => {
    const captured = mockWebhookSelect([{ id: "webhook-row-id", userId: "user-1" }]);
    const { inserts } = mockInsertAndUpdate();

    const result = await upsertUploadedUsage("raw-token", "raw-device-id", [uploadEntry]);
    const sql = inspectSql(captured.where);
    const deviceInsert = inserts.find((insert) => insert.table === devices);
    const usageInsert = inserts.find((insert) => insert.table === dailyUsage);

    expect(result).toEqual({ ok: true, status: 200, uploaded: 1 });
    expect(sql.params).toContain(hashSecret("raw-token"));
    expect(sql.params).not.toContain("raw-token");
    expect(deviceInsert?.values).toMatchObject({
      userId: "user-1",
      deviceHash: hashSecret("raw-device-id"),
      label: "Local device",
    });
    expect(deviceInsert?.values).not.toMatchObject({ deviceHash: "raw-device-id" });
    expect(usageInsert?.values).toMatchObject({
      userId: "user-1",
      deviceId: "device-row-id",
      usageDate: "2026-06-23",
    });
  });
});
