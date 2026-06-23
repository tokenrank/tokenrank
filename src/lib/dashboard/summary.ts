import type { ToolKey } from "../types";

export type DashboardUsageRow = {
  usageDate: string;
  tool: ToolKey;
  model: string;
  totalTokens: number;
  estimatedCostMicros: number;
};

export type TokenBreakdown = {
  key: string;
  totalTokens: number;
};

export type DateTotal = {
  usageDate: string;
  totalTokens: number;
};

export function summarizeUsage(rows: DashboardUsageRow[]) {
  const byDate = new Map<string, number>();
  const byTool = new Map<string, number>();
  const byModel = new Map<string, number>();
  let totalTokens = 0;
  let estimatedCostMicros = 0;

  for (const row of rows) {
    totalTokens += row.totalTokens;
    estimatedCostMicros += row.estimatedCostMicros;
    byDate.set(row.usageDate, (byDate.get(row.usageDate) ?? 0) + row.totalTokens);
    byTool.set(row.tool, (byTool.get(row.tool) ?? 0) + row.totalTokens);
    byModel.set(row.model, (byModel.get(row.model) ?? 0) + row.totalTokens);
  }

  return {
    totalTokens,
    estimatedCostMicros,
    activeDays: byDate.size,
    byDate: toDateTotals(byDate),
    byTool: toBreakdown(byTool),
    byModel: toBreakdown(byModel),
  };
}

function toDateTotals(values: Map<string, number>): DateTotal[] {
  return [...values.entries()]
    .map(([usageDate, totalTokens]) => ({ usageDate, totalTokens }))
    .sort((a, b) => a.usageDate.localeCompare(b.usageDate));
}

function toBreakdown(values: Map<string, number>): TokenBreakdown[] {
  return [...values.entries()]
    .map(([key, totalTokens]) => ({ key, totalTokens }))
    .sort((a, b) => b.totalTokens - a.totalTokens || a.key.localeCompare(b.key));
}
