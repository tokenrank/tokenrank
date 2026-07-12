import { describe, expect, it } from "vitest";

import { summarizeUsage } from "./summary";

describe("summarizeUsage", () => {
  it("aggregates totals, active days, clients, tools, models, dates, and token mix", () => {
    const summary = summarizeUsage([
      {
        usageDate: "2026-06-23",
        tool: "codex",
        model: "gpt-5.5",
        deviceId: "device-alpha-123",
        deviceLabel: "Office PC",
        inputTokens: 60,
        outputTokens: 30,
        cacheReadTokens: 8,
        cacheWriteTokens: 2,
        totalTokens: 100,
        estimatedCostMicros: 250,
      },
      {
        usageDate: "2026-06-23",
        tool: "qwen",
        model: "qwen-demo",
        deviceId: "device-beta-456",
        deviceLabel: "Laptop",
        inputTokens: 20,
        outputTokens: 25,
        cacheReadTokens: 5,
        totalTokens: 50,
        estimatedCostMicros: 100,
      },
      {
        usageDate: "2026-06-22",
        tool: "codex",
        model: "gpt-5.5",
        deviceId: "device-alpha-123",
        deviceLabel: "Office PC",
        inputTokens: 10,
        outputTokens: 15,
        totalTokens: 25,
        estimatedCostMicros: 40,
      },
    ]);

    expect(summary.totalTokens).toBe(175);
    expect(summary.estimatedCostMicros).toBe(390);
    expect(summary.inputTokens).toBe(90);
    expect(summary.outputTokens).toBe(70);
    expect(summary.cacheTokens).toBe(15);
    expect(summary.activeDays).toBe(2);
    expect(summary.uploadRows).toBe(3);
    expect(summary.uploadedClients).toBe(2);
    expect(summary.firstDate).toBe("2026-06-22");
    expect(summary.lastDate).toBe("2026-06-23");
    expect(summary.averageActiveDayTokens).toBe(88);
    expect(summary.peakDay).toEqual(
      expect.objectContaining({ usageDate: "2026-06-23", totalTokens: 150, rows: 2 }),
    );
    expect(summary.byDate).toEqual([
      expect.objectContaining({ usageDate: "2026-06-22", totalTokens: 25, rows: 1 }),
      expect.objectContaining({ usageDate: "2026-06-23", totalTokens: 150, rows: 2 }),
    ]);
    expect(summary.byClient).toEqual([
      expect.objectContaining({
        key: "device-alpha-123",
        label: "Office PC",
        totalTokens: 125,
        activeDays: 2,
        rows: 2,
        share: 125 / 175,
      }),
      expect.objectContaining({
        key: "device-beta-456",
        label: "Laptop",
        totalTokens: 50,
        activeDays: 1,
        rows: 1,
        share: 50 / 175,
      }),
    ]);
    expect(summary.byTool.slice(0, 2)).toEqual([
      expect.objectContaining({ key: "codex", label: "codex", totalTokens: 125 }),
      expect.objectContaining({ key: "qwen", label: "qwen", totalTokens: 50 }),
    ]);
    expect(summary.byModel.slice(0, 2)).toEqual([
      expect.objectContaining({ key: "gpt-5.5", label: "gpt-5.5", totalTokens: 125 }),
      expect.objectContaining({ key: "qwen-demo", label: "qwen-demo", totalTokens: 50 }),
    ]);
  });

  it("falls back to stable uploaded client labels", () => {
    const summary = summarizeUsage([
      {
        usageDate: "2026-06-23",
        tool: "codex",
        model: "gpt-5.5",
        deviceId: "abcdef123456",
        totalTokens: 100,
        estimatedCostMicros: 250,
      },
      {
        usageDate: "2026-06-24",
        tool: "codex",
        model: "gpt-5.5",
        deviceLabel: "Manual import",
        totalTokens: 50,
        estimatedCostMicros: 100,
      },
    ]);

    expect(summary.byClient).toEqual([
      expect.objectContaining({ key: "abcdef123456", label: "Client abcdef12", totalTokens: 100 }),
      expect.objectContaining({ key: "label:manual import", label: "Manual import", totalTokens: 50 }),
    ]);
  });

  it("groups unattributed model rows by tool instead of one global unknown bucket", () => {
    const summary = summarizeUsage([
      {
        usageDate: "2026-06-23",
        tool: "codex",
        model: "unknown",
        totalTokens: 100,
        estimatedCostMicros: 250,
      },
      {
        usageDate: "2026-06-24",
        tool: "codex",
        model: "codex-unattributed",
        totalTokens: 50,
        estimatedCostMicros: 100,
      },
      {
        usageDate: "2026-06-24",
        tool: "qwen",
        model: "unknown",
        totalTokens: 25,
        estimatedCostMicros: 50,
      },
    ]);

    expect(summary.byModel).toEqual([
      expect.objectContaining({
        key: "unattributed:codex",
        label: "未识别模型 · codex",
        totalTokens: 150,
      }),
      expect.objectContaining({
        key: "unattributed:qwen",
        label: "未识别模型 · qwen",
        totalTokens: 25,
      }),
    ]);
    expect(summary.byModel.some((item) => item.label === "unknown")).toBe(false);
  });
});
