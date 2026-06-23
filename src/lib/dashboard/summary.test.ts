import { describe, expect, it } from "vitest";

import { summarizeUsage } from "./summary";

describe("summarizeUsage", () => {
  it("aggregates totals, active days, tools, models, and dates", () => {
    const summary = summarizeUsage([
      {
        usageDate: "2026-06-23",
        tool: "codex",
        model: "gpt-5.5",
        totalTokens: 100,
        estimatedCostMicros: 250,
      },
      {
        usageDate: "2026-06-23",
        tool: "qwen",
        model: "qwen-demo",
        totalTokens: 50,
        estimatedCostMicros: 100,
      },
      {
        usageDate: "2026-06-22",
        tool: "codex",
        model: "gpt-5.5",
        totalTokens: 25,
        estimatedCostMicros: 40,
      },
    ]);

    expect(summary.totalTokens).toBe(175);
    expect(summary.estimatedCostMicros).toBe(390);
    expect(summary.activeDays).toBe(2);
    expect(summary.byDate).toEqual([
      { usageDate: "2026-06-22", totalTokens: 25 },
      { usageDate: "2026-06-23", totalTokens: 150 },
    ]);
    expect(summary.byTool.slice(0, 2)).toEqual([
      { key: "codex", totalTokens: 125 },
      { key: "qwen", totalTokens: 50 },
    ]);
    expect(summary.byModel.slice(0, 2)).toEqual([
      { key: "gpt-5.5", totalTokens: 125 },
      { key: "qwen-demo", totalTokens: 50 },
    ]);
  });
});
