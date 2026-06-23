import Link from "next/link";

import type { BoardKey, RangeKey } from "@/src/lib/types";

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "今日" },
  { key: "3d", label: "3天" },
  { key: "7d", label: "7天" },
  { key: "30d", label: "30天" },
  { key: "month", label: "本月" },
];

export function RangeTabs({ active, board }: { active: RangeKey; board: BoardKey }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {RANGES.map((range) => (
        <Link
          key={range.key}
          href={`/?board=${board}&range=${range.key}`}
          aria-current={active === range.key ? "page" : undefined}
          className={
            active === range.key
              ? "rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
              : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          }
        >
          {range.label}
        </Link>
      ))}
    </div>
  );
}
