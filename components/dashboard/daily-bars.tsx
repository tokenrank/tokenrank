import { formatTokens } from "@/src/lib/format";
import { TOOL_KEYS, type ToolKey } from "@/src/lib/types";

const TOOL_COLORS = [
  "#059669",
  "#2563eb",
  "#dc2626",
  "#9333ea",
  "#ca8a04",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#16a34a",
  "#be123c",
  "#0f766e",
  "#7c3aed",
  "#1d4ed8",
  "#65a30d",
  "#475569",
] as const;

type Day = {
  usageDate: string;
  tool: ToolKey;
  totalTokens: number;
};

export function DailyBars({ days }: { days: Day[] }) {
  const grouped = groupByDate(days);
  const series = lastThirtyDays().map((date) => ({
    date,
    values: grouped.get(date) ?? emptyToolTotals(),
  }));
  const max = Math.max(1, ...series.map((day) => totalForTools(day.values)));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-slate-950">最近 30 天</h2>
        <p className="mt-1 text-xs text-slate-500">按工具堆叠展示每日 Token 消耗</p>
      </div>
      <div className="flex h-56 items-end gap-1 overflow-x-auto pb-1">
        {series.map(({ date, values }) => (
          <div
            key={date}
            className="flex h-full min-w-4 flex-1 flex-col justify-end overflow-hidden rounded-t-sm bg-slate-100"
            title={`${date}: ${formatTokens(totalForTools(values))} Token`}
          >
            {TOOL_KEYS.map((tool, index) => {
              const height = (values[tool] / max) * 100;
              if (height === 0) return null;

              return (
                <div
                  key={tool}
                  style={{
                    backgroundColor: TOOL_COLORS[index % TOOL_COLORS.length],
                    height: `${height}%`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function groupByDate(days: Day[]): Map<string, Record<ToolKey, number>> {
  const grouped = new Map<string, Record<ToolKey, number>>();

  for (const day of days) {
    const current = grouped.get(day.usageDate) ?? emptyToolTotals();
    current[day.tool] += day.totalTokens;
    grouped.set(day.usageDate, current);
  }

  return grouped;
}

function emptyToolTotals(): Record<ToolKey, number> {
  return Object.fromEntries(TOOL_KEYS.map((tool) => [tool, 0])) as Record<ToolKey, number>;
}

function totalForTools(value: Record<ToolKey, number>): number {
  return TOOL_KEYS.reduce((sum, tool) => sum + value[tool], 0);
}

function lastThirtyDays(): string[] {
  const today = utcToday();

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (29 - index));
    return date.toISOString().slice(0, 10);
  });
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
