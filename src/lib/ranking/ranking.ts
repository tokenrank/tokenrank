import {
  TOOL_KEYS,
  type BoardKey,
  type LeaderboardEntry,
  type RangeKey,
  type ToolKey,
  type UsageRow,
} from "../types";

type RankOptions = {
  board: BoardKey;
  range: RangeKey;
  now?: Date;
};

export function getRangeStart(range: RangeKey, now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (range === "month") {
    return toDateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  }

  const days = range === "today" ? 1 : Number.parseInt(range.replace("d", ""), 10);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return toDateKey(date);
}

export function rankUsageRows(rows: UsageRow[], options: RankOptions): LeaderboardEntry[] {
  const now = options.now ?? new Date();
  const start = getRangeStart(options.range, now);
  const end = toDateKey(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
  const filtered = rows.filter((row) => !row.blocked && row.date >= start && row.date <= end);
  const byUser = new Map<string, UsageRow[]>();

  for (const row of filtered) {
    const existing = byUser.get(row.userId) ?? [];
    existing.push(row);
    byUser.set(row.userId, existing);
  }

  const entries = [...byUser.values()].map((userRows) => {
    const countedRows = topThreeDeviceRows(userRows);
    const first = countedRows[0] ?? userRows[0];
    const byTool = Object.fromEntries(TOOL_KEYS.map((tool) => [tool, 0])) as Record<
      ToolKey,
      number
    >;
    let totalTokens = 0;
    let estimatedCostMicros = 0;

    for (const row of countedRows) {
      byTool[row.tool] += row.totalTokens;
      totalTokens += row.totalTokens;
      estimatedCostMicros += row.estimatedCostMicros;
    }

    return {
      rank: 0,
      userId: first.userId,
      handle: first.handle,
      name: first.name,
      avatarUrl: first.avatarUrl,
      score: scoreForBoard(options.board, totalTokens, estimatedCostMicros, byTool),
      estimatedCostMicros,
      byTool,
    };
  });

  return entries
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function topThreeDeviceRows(rows: UsageRow[]): UsageRow[] {
  const deviceTotals = new Map<string, number>();

  for (const row of rows) {
    deviceTotals.set(row.deviceId, (deviceTotals.get(row.deviceId) ?? 0) + row.totalTokens);
  }

  const countedDevices = new Set(
    [...deviceTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([deviceId]) => deviceId),
  );

  return rows.filter((row) => countedDevices.has(row.deviceId));
}

function scoreForBoard(
  board: BoardKey,
  totalTokens: number,
  estimatedCostMicros: number,
  byTool: Record<ToolKey, number>,
): number {
  if (board === "cost") return estimatedCostMicros;
  if (board === "total") return totalTokens;
  return byTool[board];
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
