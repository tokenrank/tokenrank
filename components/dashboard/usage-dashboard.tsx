import { Share2 } from "lucide-react";

import { boardLabel } from "@/components/leaderboard/board-tabs";
import { formatTokens, formatUsdMicros } from "@/src/lib/format";
import { summarizeUsage, type DashboardUsageRow } from "@/src/lib/dashboard/summary";
import { TOOL_KEYS, type ToolKey } from "@/src/lib/types";

import { ActivityHeatmap } from "./activity-heatmap";
import { DailyBars } from "./daily-bars";

type Usage = DashboardUsageRow & {
  updatedAt?: Date | string;
};

export function UsageDashboard({
  name,
  handle,
  daily,
}: {
  name: string;
  handle: string;
  daily: Usage[];
}) {
  const summary = summarizeUsage(daily);
  const todayTotal = totalForDate(daily, utcDateKey(new Date()));
  const latestSync = latestUpdatedAt(daily);
  const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
    `我在 TokenRank 已经消耗 ${formatTokens(summary.totalTokens)} AI Coding Token。`,
  )}`;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">公开 Dashboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">{name}</h1>
          <p className="mt-1 text-sm text-slate-500">@{handle}</p>
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Share2 className="size-4" aria-hidden="true" />
          分享到 X
        </a>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="今日 Token" value={formatTokens(todayTotal)} />
        <Stat label="累计 Token" value={formatTokens(summary.totalTokens)} />
        <Stat label="消耗金额" value={formatUsdMicros(summary.estimatedCostMicros)} />
        <Stat label="活跃天数" value={`${summary.activeDays} 天`} hint={latestSync} />
      </section>

      <ActivityHeatmap days={summary.byDate} />
      <DailyBars days={daily} />

      <section className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="按工具" items={summary.byTool.slice(0, 10)} labelForKey={toolName} />
        <Breakdown title="按模型" items={summary.byModel.slice(0, 10)} />
      </section>

      <DailyDetailTable rows={daily.slice(0, 80)} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-2xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
      {hint ? <div className="mt-3 text-xs text-slate-400">最近同步 {hint}</div> : null}
    </div>
  );
}

function Breakdown({
  title,
  items,
  labelForKey = (key) => key,
}: {
  title: string;
  items: Array<{ key: string; totalTokens: number }>;
  labelForKey?: (key: string) => string;
}) {
  const max = Math.max(1, ...items.map((item) => item.totalTokens));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.key} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-slate-700">{labelForKey(item.key)}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {formatTokens(item.totalTokens)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${Math.max(2, (item.totalTokens / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DailyDetailTable({ rows }: { rows: Usage[] }) {
  if (!rows.length) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        暂无每日明细
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-950">每日明细</h2>
        <p className="mt-1 text-xs text-slate-500">最近上传记录，按日期倒序</p>
      </div>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
          <tr>
            <th className="px-4 py-3">日期</th>
            <th className="px-4 py-3">工具</th>
            <th className="px-4 py-3">模型</th>
            <th className="px-4 py-3 text-right">Token</th>
            <th className="px-4 py-3 text-right">金额</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.usageDate}-${row.tool}-${row.model}-${index}`} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-700">{row.usageDate}</td>
              <td className="px-4 py-3 text-slate-600">{toolName(row.tool)}</td>
              <td className="px-4 py-3 text-slate-600">{row.model}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-950">
                {formatTokens(row.totalTokens)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                {formatUsdMicros(row.estimatedCostMicros)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function totalForDate(rows: Usage[], date: string): number {
  return rows
    .filter((row) => row.usageDate === date)
    .reduce((sum, row) => sum + row.totalTokens, 0);
}

function latestUpdatedAt(rows: Usage[]): string | undefined {
  const latest = rows
    .map((row) => (row.updatedAt ? new Date(row.updatedAt).getTime() : 0))
    .filter((time) => Number.isFinite(time) && time > 0)
    .sort((a, b) => b - a)[0];

  return latest ? new Date(latest).toLocaleString("zh-CN", { hour12: false }) : undefined;
}

function toolName(value: string): string {
  return (TOOL_KEYS as readonly string[]).includes(value) ? boardLabel(value as ToolKey) : value;
}

function utcDateKey(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}
