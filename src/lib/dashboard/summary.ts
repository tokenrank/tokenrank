import type { ToolKey } from "../types";

export type DashboardUsageRow = {
  usageDate: string;
  tool: ToolKey;
  model: string;
  deviceId?: string | null;
  deviceLabel?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheWriteTokens?: number | null;
  totalTokens: number;
  estimatedCostMicros: number;
};

export type TokenBreakdown = {
  key: string;
  label: string;
  totalTokens: number;
  estimatedCostMicros: number;
  activeDays: number;
  rows: number;
  share: number;
};

export type DateTotal = {
  usageDate: string;
  totalTokens: number;
  estimatedCostMicros: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  rows: number;
};

type BreakdownAccumulator = {
  key: string;
  label: string;
  totalTokens: number;
  estimatedCostMicros: number;
  rows: number;
  dates: Set<string>;
};

type DateAccumulator = {
  usageDate: string;
  totalTokens: number;
  estimatedCostMicros: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  rows: number;
};

export function summarizeUsage(rows: DashboardUsageRow[]) {
  const byDate = new Map<string, DateAccumulator>();
  const byClient = new Map<string, BreakdownAccumulator>();
  const byTool = new Map<string, BreakdownAccumulator>();
  const byModel = new Map<string, BreakdownAccumulator>();
  let totalTokens = 0;
  let estimatedCostMicros = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;

  for (const row of rows) {
    const rowInputTokens = normalizedNumber(row.inputTokens);
    const rowOutputTokens = normalizedNumber(row.outputTokens);
    const rowCacheReadTokens = normalizedNumber(row.cacheReadTokens);
    const rowCacheWriteTokens = normalizedNumber(row.cacheWriteTokens);

    totalTokens += row.totalTokens;
    estimatedCostMicros += row.estimatedCostMicros;
    inputTokens += rowInputTokens;
    outputTokens += rowOutputTokens;
    cacheReadTokens += rowCacheReadTokens;
    cacheWriteTokens += rowCacheWriteTokens;

    const day = byDate.get(row.usageDate) ?? {
      usageDate: row.usageDate,
      totalTokens: 0,
      estimatedCostMicros: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      rows: 0,
    };

    day.totalTokens += row.totalTokens;
    day.estimatedCostMicros += row.estimatedCostMicros;
    day.inputTokens += rowInputTokens;
    day.outputTokens += rowOutputTokens;
    day.cacheReadTokens += rowCacheReadTokens;
    day.cacheWriteTokens += rowCacheWriteTokens;
    day.rows += 1;
    byDate.set(row.usageDate, day);

    const client = clientIdentity(row);
    const model = modelIdentity(row);
    addBreakdownRow(byClient, client.key, client.label, row);
    addBreakdownRow(byTool, row.tool, row.tool, row);
    addBreakdownRow(byModel, model.key, model.label, row);
  }

  const byDateTotals = toDateTotals(byDate);
  const peakDay = [...byDateTotals].sort(
    (a, b) => b.totalTokens - a.totalTokens || b.usageDate.localeCompare(a.usageDate),
  )[0];

  return {
    totalTokens,
    estimatedCostMicros,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    cacheTokens: cacheReadTokens + cacheWriteTokens,
    activeDays: byDateTotals.length,
    uploadRows: rows.length,
    uploadedClients: byClient.size,
    firstDate: byDateTotals[0]?.usageDate,
    lastDate: byDateTotals[byDateTotals.length - 1]?.usageDate,
    averageActiveDayTokens: byDateTotals.length ? Math.round(totalTokens / byDateTotals.length) : 0,
    peakDay,
    byDate: byDateTotals,
    byClient: toBreakdown(byClient, totalTokens),
    byTool: toBreakdown(byTool, totalTokens),
    byModel: toBreakdown(byModel, totalTokens),
  };
}

function addBreakdownRow(
  values: Map<string, BreakdownAccumulator>,
  key: string,
  label: string,
  row: DashboardUsageRow,
): void {
  const current = values.get(key) ?? {
    key,
    label,
    totalTokens: 0,
    estimatedCostMicros: 0,
    rows: 0,
    dates: new Set<string>(),
  };

  current.totalTokens += row.totalTokens;
  current.estimatedCostMicros += row.estimatedCostMicros;
  current.rows += 1;
  current.dates.add(row.usageDate);
  values.set(key, current);
}

function toDateTotals(values: Map<string, DateAccumulator>): DateTotal[] {
  return [...values.values()]
    .sort((a, b) => a.usageDate.localeCompare(b.usageDate));
}

function toBreakdown(values: Map<string, BreakdownAccumulator>, totalTokens: number): TokenBreakdown[] {
  return [...values.values()]
    .map((item) => ({
      key: item.key,
      label: item.label,
      totalTokens: item.totalTokens,
      estimatedCostMicros: item.estimatedCostMicros,
      activeDays: item.dates.size,
      rows: item.rows,
      share: totalTokens > 0 ? item.totalTokens / totalTokens : 0,
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens || a.label.localeCompare(b.label));
}

function clientIdentity(row: DashboardUsageRow): { key: string; label: string } {
  const deviceId = row.deviceId?.trim();
  const deviceLabel = row.deviceLabel?.trim();

  if (deviceId) {
    return {
      key: deviceId,
      label: deviceLabel || `Client ${shortId(deviceId)}`,
    };
  }

  if (deviceLabel) {
    return {
      key: `label:${deviceLabel.toLowerCase()}`,
      label: deviceLabel,
    };
  }

  return {
    key: "unknown-client",
    label: "Unknown client",
  };
}

function modelIdentity(row: DashboardUsageRow): { key: string; label: string } {
  const model = row.model.trim();
  const normalized = model.toLowerCase();

  if (!model || normalized === "unknown" || normalized === `${row.tool}-unattributed`) {
    return {
      key: `unattributed:${row.tool}`,
      label: `未识别模型 · ${row.tool}`,
    };
  }

  return { key: model, label: model };
}

function shortId(value: string): string {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function normalizedNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
