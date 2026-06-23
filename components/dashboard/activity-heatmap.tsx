import { formatTokens } from "@/src/lib/format";

type Day = {
  usageDate: string;
  totalTokens: number;
};

const HEAT_COLORS = [
  "bg-slate-100",
  "bg-emerald-100",
  "bg-emerald-300",
  "bg-emerald-500",
  "bg-emerald-700",
] as const;

export function ActivityHeatmap({ days }: { days: Day[] }) {
  const byDate = new Map(days.map((day) => [day.usageDate, day.totalTokens]));
  const today = utcToday();
  const cells = Array.from({ length: 210 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (209 - index));
    const key = date.toISOString().slice(0, 10);
    const total = byDate.get(key) ?? 0;
    return { key, total };
  });
  const max = Math.max(1, ...cells.map((cell) => cell.total));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-950">活跃热力图</h2>
          <p className="mt-1 text-xs text-slate-500">近 8 个月，每格一天</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span>少</span>
          {HEAT_COLORS.map((color) => (
            <span key={color} className={`size-3 rounded-sm ${color}`} />
          ))}
          <span>多</span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
          {cells.map((cell) => {
            const level = cell.total === 0 ? 0 : Math.ceil((cell.total / max) * 4);
            return (
              <div
                key={cell.key}
                title={`${cell.key}: ${formatTokens(cell.total)} Token`}
                className={`size-3 rounded-sm ${HEAT_COLORS[level]}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
