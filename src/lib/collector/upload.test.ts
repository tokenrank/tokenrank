import { describe, expect, it } from "vitest";
import { hashUploadEntries, parseUploadPayload } from "./upload";
import { TOOL_KEYS } from "../types";

const CONTENT_FIELD_KEYS = ["prompt", "content", "code"] as const;

describe("parseUploadPayload", () => {
  it("accepts a v2 full snapshot batch", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-12345678",
      clientVersion: "0.2.0",
      timezone: "UTC",
      generatedAt: "2026-07-16T02:00:00.000Z",
      accountingVersion: 2,
      syncMode: "full",
      snapshotId: "snapshot_20260716_020000",
      cutoverDate: "2026-07-15",
      batchHash: "a".repeat(64),
      batchIndex: 0,
      batchCount: 1,
      entries: [],
    });

    expect(parsed).toMatchObject({ accountingVersion: 2, syncMode: "full", batchIndex: 0 });
  });

  it("rejects out-of-range full snapshot batch indexes", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-12345678",
        clientVersion: "0.2.0",
        timezone: "UTC",
        generatedAt: "2026-07-16T02:00:00.000Z",
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "snapshot_20260716_020000",
        cutoverDate: "2026-07-15",
        batchHash: "a".repeat(64),
        batchIndex: 1,
        batchCount: 1,
        entries: [],
      }),
    ).toThrow();
  });

  it("rejects full snapshot rows before the UTC cutover date", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-12345678",
        clientVersion: "0.2.0",
        timezone: "UTC",
        generatedAt: "2026-07-16T02:00:00.000Z",
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "snapshot_20260716_020000",
        cutoverDate: "2026-07-15",
        batchHash: "a".repeat(64),
        batchIndex: 0,
        batchCount: 1,
        entries: [
          {
            date: "2026-07-14",
            tool: "codex",
            model: "gpt-5.5",
            input: 1,
            output: 2,
            cacheRead: 0,
            cacheWrite: 0,
            total: 3,
          },
        ],
      }),
    ).toThrow();
  });

  it("caps full snapshots at 100 batches", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-12345678",
        clientVersion: "0.2.0",
        timezone: "UTC",
        generatedAt: "2026-07-16T02:00:00.000Z",
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: "snapshot_20260716_020000",
        cutoverDate: "2026-07-15",
        batchHash: "a".repeat(64),
        batchIndex: 0,
        batchCount: 101,
        entries: [],
      }),
    ).toThrow();
  });

  it("accepts high-water incremental rows without deletion metadata", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-12345678",
      clientVersion: "0.2.0",
      timezone: "UTC",
      generatedAt: "2026-07-16T02:00:00.000Z",
      accountingVersion: 2,
      syncMode: "incremental",
      entries: [
        {
          date: "2026-07-16",
          tool: "codex",
          model: "gpt-5.5",
          input: 1,
          output: 2,
          cacheRead: 0,
          cacheWrite: 0,
          total: 3,
        },
      ],
    });

    expect(parsed).toMatchObject({
      accountingVersion: 2,
      syncMode: "incremental",
      entries: [{ date: "2026-07-16", tool: "codex", model: "gpt-5.5", total: 3 }],
    });
  });

  it("rejects incremental deletion metadata", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-12345678",
        clientVersion: "0.2.0",
        timezone: "UTC",
        generatedAt: "2026-07-16T02:00:00.000Z",
        accountingVersion: 2,
        syncMode: "incremental",
        deleteKeys: [{ date: "2026-07-16", tool: "codex", model: "gpt-5.5" }],
        entries: [],
      }),
    ).toThrow();
  });

  it("hashes full snapshot entries deterministically", async () => {
    await expect(hashUploadEntries([])).resolves.toBe(
      "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    );
  });

  it("accepts valid aggregate rows", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-1",
      clientVersion: "0.1.0",
      timezone: "Asia/Shanghai",
      generatedAt: "2026-06-22T12:00:00.000Z",
      entries: [
        {
          date: "2026-06-22",
          tool: "codex",
          model: "gpt-5.5",
          input: 100,
          output: 50,
          cacheRead: 20,
          cacheWrite: 10,
          total: 150,
        },
      ],
    });

    expect(parsed.entries[0].total).toBe(150);
  });

  it("accepts Codex provider totals that already include cached input", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-1",
      clientVersion: "0.1.0",
      timezone: "Asia/Shanghai",
      generatedAt: "2026-06-22T12:00:00.000Z",
      entries: [
        {
          date: "2026-06-22",
          tool: "codex",
          model: "gpt-5.5",
          input: 1_000,
          output: 200,
          cacheRead: 800,
          cacheWrite: 0,
          total: 1_200,
        },
      ],
    });

    expect(parsed.entries[0].total).toBe(1_200);
  });

  it("accepts legacy summed totals for older collectors", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-1",
      clientVersion: "0.1.0",
      timezone: "Asia/Shanghai",
      generatedAt: "2026-06-22T12:00:00.000Z",
      entries: [
        {
          date: "2026-06-22",
          tool: "claude-code",
          model: "claude-fixture",
          input: 1_000,
          output: 200,
          cacheRead: 800,
          cacheWrite: 50,
          total: 2_050,
        },
      ],
    });

    expect(parsed.entries[0].total).toBe(2_050);
  });

  it.each(CONTENT_FIELD_KEYS)("rejects top-level content field %s", (field) => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [],
        [field]: "do not upload this",
      }),
    ).toThrow();
  });

  it.each(CONTENT_FIELD_KEYS)("rejects entry-level content field %s", (field) => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [
          {
            date: "2026-06-22",
            tool: "codex",
            model: "gpt-5.5",
            input: 100,
            output: 50,
            cacheRead: 200,
            cacheWrite: 10,
            total: 360,
            [field]: "do not upload this",
          },
        ],
      }),
    ).toThrow();
  });

  it("accepts every supported tool", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-1",
      clientVersion: "0.1.0",
      timezone: "Asia/Shanghai",
      generatedAt: "2026-06-22T12:00:00.000Z",
      entries: TOOL_KEYS.map((tool) => ({
        date: "2026-06-22",
        tool,
        model: `${tool}-demo`,
        input: 1,
        output: 2,
        cacheRead: 3,
        cacheWrite: 4,
        total: 10,
      })),
    });

    expect(parsed.entries).toHaveLength(TOOL_KEYS.length);
  });

  it("rejects incremental batches over 500 entries", () => {
    const entries = Array.from({ length: 501 }, (_, index) => ({
      date: "2026-07-16",
      tool: "codex" as const,
      model: `entry-${index}`,
      input: 1,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 1,
    }));

    expect(() =>
      parseUploadPayload({
        deviceId: "device-12345678",
        clientVersion: "0.2.0",
        timezone: "UTC",
        generatedAt: "2026-07-16T00:00:00.000Z",
        accountingVersion: 2,
        syncMode: "incremental",
        entries,
      }),
    ).toThrow();
  });

  it("rejects duplicate aggregate keys before they reach a bulk upsert", () => {
    const entry = {
      date: "2026-07-16",
      tool: "codex" as const,
      model: "gpt-5.5",
      input: 1,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 1,
    };

    expect(() =>
      parseUploadPayload({
        deviceId: "device-12345678",
        clientVersion: "0.2.0",
        timezone: "UTC",
        generatedAt: "2026-07-16T00:00:00.000Z",
        accountingVersion: 2,
        syncMode: "incremental",
        entries: [entry, entry],
      }),
    ).toThrow(/duplicate date, tool, and model keys/);
  });

  it("rejects token counters that cannot be represented safely end to end", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-12345678",
        clientVersion: "0.2.0",
        timezone: "UTC",
        generatedAt: "2026-07-16T00:00:00.000Z",
        accountingVersion: 2,
        syncMode: "incremental",
        entries: [
          {
            date: "2026-07-16",
            tool: "codex",
            model: "gpt-5.5",
            input: Number.MAX_SAFE_INTEGER,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            total: Number.MAX_SAFE_INTEGER,
          },
        ],
      }),
    ).toThrow();
  });

  it.each(["cursor", "github-copilot", "continue"] as const)(
    "accepts %s aggregate rows",
    (tool) => {
      const parsed = parseUploadPayload({
        deviceId: "device-12345678",
        clientVersion: "0.2.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-07-12T04:00:00.000Z",
        entries: [
          {
            date: "2026-07-12",
            tool,
            model: `${tool}-model`,
            input: 7,
            output: 5,
            cacheRead: 0,
            cacheWrite: 0,
            total: 12,
          },
        ],
      });

      expect(parsed.entries[0].tool).toBe(tool);
    },
  );

  it("rejects unsupported tools", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [
          {
            date: "2026-06-22",
            tool: "unknown",
            model: "model",
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects negative counts", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [
          {
            date: "2026-06-22",
            tool: "codex",
            model: "model",
            input: -1,
            output: 1,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects total mismatches", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [
          {
            date: "2026-06-22",
            tool: "codex",
            model: "model",
            input: 1,
            output: 2,
            cacheRead: 3,
            cacheWrite: 4,
            total: 11,
          },
        ],
      }),
    ).toThrow();
  });

  it.each(["2026-99-99", "2026-02-31"] as const)(
    "rejects invalid calendar date %s",
    (date) => {
      expect(() =>
        parseUploadPayload({
          deviceId: "device-1",
          clientVersion: "0.1.0",
          timezone: "Asia/Shanghai",
          generatedAt: "2026-06-22T12:00:00.000Z",
          entries: [
            {
              date,
              tool: "codex",
              model: "model",
              input: 1,
              output: 2,
              cacheRead: 3,
              cacheWrite: 4,
              total: 10,
            },
          ],
        }),
      ).toThrow();
    },
  );
});
