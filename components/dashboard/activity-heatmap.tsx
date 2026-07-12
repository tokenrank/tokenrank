import { defaultLocale, type Locale } from "@/src/i18n/config";
import { defaultCopy, text, type AppCopy } from "@/src/i18n/copy";
import { formatInteger } from "@/src/lib/format";

type Day = {
  usageDate: string;
  totalTokens: number;
};

const POINT_STYLES = [
  "bg-[color:var(--tr-surface-3)]",
  "bg-[#3c481b]",
  "bg-[#748b24]",
  "bg-[color:var(--tr-gold)]",
  "bg-[color:var(--tr-gold-bright)]",
] as const;

const WEEKS = 32;
const DAYS_PER_WEEK = 7;
const CELL_COUNT = WEEKS * DAYS_PER_WEEK;

export function ActivityHeatmap({
  copy = defaultCopy.dashboard.usage.heatmap,
  days,
  locale = defaultLocale,
}: {
  copy?: AppCopy["dashboard"]["usage"]["heatmap"];
  days: Day[];
  locale?: Locale;
}) {
  const byDate = new Map(days.map((day) => [day.usageDate, day.totalTokens]));
  const endDate = latestDate(days) ?? utcToday();
  const cells = Array.from({ length: CELL_COUNT }, (_, index) => {
    const date = new Date(endDate);
    date.setUTCDate(endDate.getUTCDate() - (CELL_COUNT - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const total = byDate.get(key) ?? 0;
    return { key, total };
  });
  const weeks = Array.from({ length: WEEKS }, (_, index) =>
    cells.slice(index * DAYS_PER_WEEK, (index + 1) * DAYS_PER_WEEK),
  );
  const monthLabels = weeks.map((week, index) => {
    const month = week[0]?.key.slice(5, 7);
    const previousMonth = weeks[index - 1]?.[0]?.key.slice(5, 7);

    return index === 0 || month !== previousMonth ? formatMonth(week[0]?.key, locale, copy.month) : "";
  });
  const max = Math.max(1, ...cells.map((cell) => cell.total));
  const activePoints = cells.filter((cell) => cell.total > 0).length;

  return (
    <section className="tr-shell tr-reveal">
      <div className="tr-panel p-5">
        <div className="mb-5 flex flex-col gap-3 border-b border-[color:var(--tr-line)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="tr-data-label">Activity matrix / 32W</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">{copy.title}</h2>
            <p className="mt-2 font-mono text-xs font-semibold text-[color:var(--tr-muted)]">
              {text(copy.subtitle, { count: activePoints })}
            </p>
          </div>
          <div className="flex items-center gap-1 font-mono text-[0.62rem] font-semibold uppercase text-[color:var(--tr-muted)]">
            <span>{copy.low}</span>
            {POINT_STYLES.map((style) => (
              <span key={style} className={`size-3 ${style}`} />
            ))}
            <span>{copy.high}</span>
          </div>
        </div>
        <div className="overflow-x-auto pb-1 tr-scrollbar">
          <div className="w-max border border-[color:var(--tr-line)] bg-black/35 p-3">
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, 0.875rem)` }}
            >
              {weeks.map((week, weekIndex) => (
                <div key={week[0]?.key ?? weekIndex} className="grid grid-rows-7 gap-1.5">
                  {week.map((cell) => {
                    const level = cell.total === 0 ? 0 : Math.ceil((cell.total / max) * 4);
                    const exactTotal = formatInteger(cell.total);

                    return (
                      <div
                        key={cell.key}
                        title={`${cell.key}: ${exactTotal} Token`}
                        aria-label={`${cell.key}: ${exactTotal} Token`}
                        className={`size-3.5 transition-transform hover:scale-125 ${POINT_STYLES[level]}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div
              aria-hidden="true"
              className="mt-3 grid gap-1.5 font-mono text-[0.6rem] font-bold leading-none text-[color:var(--tr-muted)]"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, 0.875rem)` }}
            >
              {monthLabels.map((label, index) => (
                <span key={`${label}-${index}`} className="whitespace-nowrap">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatMonth(key: string | undefined, locale: Locale, template: string): string {
  if (!key) return "";
  if (locale === "zh") return text(template, { month: Number(key.slice(5, 7)) });
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    new Date(`${key}T00:00:00.000Z`),
  );
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function latestDate(days: Day[]): Date | undefined {
  const latest = days
    .map((day) => new Date(`${day.usageDate}T00:00:00.000Z`).getTime())
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)[0];

  return latest ? new Date(latest) : undefined;
}
