import { describe, expect, it } from "vitest";

import { buildCompetitiveContext } from "./competitive-context";
import type { DashboardUsageRow } from "./summary";
import type { LeaderboardEntry } from "../types";

function usage(usageDate: string, totalTokens: number): DashboardUsageRow {
  return {
    usageDate,
    tool: "codex",
    model: "gpt-5.5",
    totalTokens,
    estimatedCostMicros: 0,
  };
}

function leaderboard(userIds: string[]): LeaderboardEntry[] {
  return userIds.map((userId, index) => ({
    rank: index + 1,
    userId,
    handle: userId,
    name: userId,
    avatarUrl: null,
    score: userIds.length - index,
    estimatedCostMicros: 0,
    byTool: {
      codex: 0,
      "claude-code": 0,
      hermes: 0,
      openclaw: 0,
      cline: 0,
      opencode: 0,
      workbuddy: 0,
      gemini: 0,
      zcode: 0,
      kimi: 0,
      "kilo-code": 0,
      "codex-vps": 0,
      "roo-code": 0,
      qwen: 0,
      "codex-cache": 0,
      cursor: 0,
      "github-copilot": 0,
      continue: 0,
    },
  }));
}

describe("buildCompetitiveContext", () => {
  it("combines 7-day rank, top percentage, active streak, and prior-week change", () => {
    const context = buildCompetitiveContext({
      userId: "user-2",
      now: new Date("2026-07-19T12:00:00.000Z"),
      leaderboard: leaderboard(["user-1", "user-2", "user-3", "user-4", "user-5"]),
      daily: [
        usage("2026-07-13", 100),
        usage("2026-07-17", 100),
        usage("2026-07-18", 100),
        usage("2026-07-12", 100),
      ],
    });

    expect(context).toEqual({
      rank: 2,
      participants: 5,
      topPercent: 40,
      currentStreak: 2,
      last7Tokens: 300,
      previous7Tokens: 100,
      changePercent: 200,
    });
  });

  it("returns an honest unranked state and no infinite change without a baseline", () => {
    const context = buildCompetitiveContext({
      userId: "not-ranked",
      now: new Date("2026-07-19T12:00:00.000Z"),
      leaderboard: leaderboard(["user-1"]),
      daily: [usage("2026-07-19", 100)],
    });

    expect(context.rank).toBeNull();
    expect(context.topPercent).toBeNull();
    expect(context.currentStreak).toBe(1);
    expect(context.changePercent).toBeNull();
  });

  it("resets the active streak after more than one inactive UTC day", () => {
    const context = buildCompetitiveContext({
      userId: "user-1",
      now: new Date("2026-07-19T12:00:00.000Z"),
      leaderboard: leaderboard(["user-1"]),
      daily: [usage("2026-07-17", 100)],
    });

    expect(context.currentStreak).toBe(0);
  });
});
