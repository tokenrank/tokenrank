import { describe, expect, it } from "vitest";
import type { UsageRow } from "../types";
import { getRangeStart, rankUsageRows } from "./ranking";

const now = new Date("2026-06-22T12:00:00.000Z");

function row(overrides: Partial<UsageRow>): UsageRow {
  return {
    userId: "u1",
    handle: "alice",
    name: "Alice",
    avatarUrl: null,
    deviceId: "d1",
    date: "2026-06-22",
    tool: "codex",
    model: "gpt-5.5",
    inputTokens: 1,
    outputTokens: 1,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 100,
    estimatedCostMicros: 10,
    ...overrides,
  };
}

describe("getRangeStart", () => {
  it("calculates inclusive range starts in UTC dates", () => {
    expect(getRangeStart("today", now)).toBe("2026-06-22");
    expect(getRangeStart("3d", now)).toBe("2026-06-20");
    expect(getRangeStart("7d", now)).toBe("2026-06-16");
    expect(getRangeStart("30d", now)).toBe("2026-05-24");
    expect(getRangeStart("month", now)).toBe("2026-06-01");
  });
});

describe("rankUsageRows", () => {
  it("ranks by total tokens and groups by user", () => {
    const entries = rankUsageRows(
      [
        row({ userId: "u1", handle: "alice", name: "Alice", totalTokens: 100 }),
        row({
          userId: "u1",
          handle: "alice",
          name: "Alice",
          deviceId: "d2",
          totalTokens: 250,
        }),
        row({ userId: "u2", handle: "bob", name: "Bob", totalTokens: 200 }),
      ],
      { board: "total", range: "today", now },
    );

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => [entry.rank, entry.handle, entry.score])).toEqual([
      [1, "alice", 350],
      [2, "bob", 200],
    ]);
  });

  it("caps counted devices to top three by aggregated device totals", () => {
    const entries = rankUsageRows(
      [
        row({ deviceId: "d1", totalTokens: 180 }),
        row({ deviceId: "d1", totalTokens: 170 }),
        row({ deviceId: "d2", totalTokens: 340 }),
        row({ deviceId: "d3", totalTokens: 330 }),
        row({ deviceId: "d4", totalTokens: 300 }),
      ],
      { board: "total", range: "today", now },
    );

    expect(entries[0].score).toBe(1020);
  });

  it("filters blocked rows and dates outside the range", () => {
    const entries = rankUsageRows(
      [
        row({ totalTokens: 100 }),
        row({ totalTokens: 900, blocked: true }),
        row({ totalTokens: 800, date: "2026-06-10" }),
      ],
      { board: "total", range: "7d", now },
    );

    expect(entries[0].score).toBe(100);
  });

  it("supports cost and tool boards", () => {
    const rows = [
      row({ tool: "codex", totalTokens: 100, estimatedCostMicros: 500 }),
      row({ tool: "claude-code", totalTokens: 300, estimatedCostMicros: 200 }),
      row({ tool: "qwen", totalTokens: 450, estimatedCostMicros: 300 }),
    ];

    expect(rankUsageRows(rows, { board: "cost", range: "today", now })[0].score).toBe(1000);
    expect(rankUsageRows(rows, { board: "codex", range: "today", now })[0].score).toBe(100);
    expect(rankUsageRows(rows, { board: "qwen", range: "today", now })[0].score).toBe(450);
  });

  it("filters users with zero score for the selected board", () => {
    const entries = rankUsageRows(
      [
        row({ userId: "u1", handle: "alice", name: "Alice", tool: "codex", totalTokens: 100 }),
        row({ userId: "u2", handle: "bob", name: "Bob", tool: "qwen", totalTokens: 250 }),
      ],
      { board: "qwen", range: "today", now },
    );

    expect(entries.map((entry) => [entry.handle, entry.score])).toEqual([["bob", 250]]);
  });
});
