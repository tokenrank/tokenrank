import Link from "next/link";

import { boardLabel } from "@/components/leaderboard/board-tabs";
import { formatTokens, formatUsdMicros } from "@/src/lib/format";
import { TOOL_KEYS, type BoardKey, type LeaderboardEntry, type ToolKey } from "@/src/lib/types";

export function LeaderboardTable({
  board,
  entries,
}: {
  board: BoardKey;
  entries: LeaderboardEntry[];
}) {
  if (!entries.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        暂无数据
      </div>
    );
  }

  const scoreLabel = board === "cost" ? "消耗金额" : `${boardLabel(board)} Token`;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
          <tr>
            <th className="w-20 px-4 py-3">排名</th>
            <th className="px-4 py-3">X 身份</th>
            <th className="px-4 py-3 text-right">{scoreLabel}</th>
            <th className="px-4 py-3 text-right">预估金额</th>
            <th className="px-4 py-3">主要工具</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.userId} className="border-t border-slate-100">
              <td className="px-4 py-4 align-middle font-bold text-slate-500">#{entry.rank}</td>
              <td className="px-4 py-4 align-middle">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar entry={entry} />
                  <div className="min-w-0">
                    <Link
                      href={`/u/${entry.handle}`}
                      className="block truncate font-semibold text-slate-950 hover:underline"
                    >
                      {entry.name}
                    </Link>
                    <div className="truncate text-xs text-slate-500">@{entry.handle}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-right align-middle font-bold tabular-nums text-slate-950">
                {board === "cost" ? formatUsdMicros(entry.score) : formatTokens(entry.score)}
              </td>
              <td className="px-4 py-4 text-right align-middle tabular-nums text-slate-500">
                {formatUsdMicros(entry.estimatedCostMicros)}
              </td>
              <td className="px-4 py-4 align-middle">
                <ToolBreakdown byTool={entry.byTool} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  if (entry.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.avatarUrl}
        alt=""
        className="size-10 shrink-0 rounded-full border border-slate-200 object-cover"
      />
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
      {entry.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function ToolBreakdown({ byTool }: { byTool: Record<ToolKey, number> }) {
  const topTools = TOOL_KEYS.map((tool) => ({ tool, value: byTool[tool] }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  if (!topTools.length) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {topTools.map((item) => (
        <span
          key={item.tool}
          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
        >
          {boardLabel(item.tool)} {formatTokens(item.value)}
        </span>
      ))}
    </div>
  );
}
