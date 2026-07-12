import { defaultLocale, type Locale } from "@/src/i18n/config";
import { defaultCopy, text, type AppCopy } from "@/src/i18n/copy";
import { formatInteger, formatTokens } from "@/src/lib/format";

type Day = {
  usageDate: string;
  totalTokens: number;
};

type TrendDay = Day & {
  x: number;
  y: number;
};

const CHART_WIDTH = 920;
const CHART_HEIGHT = 260;
const PADDING_X = 24;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 34;
const TREND_DAYS = 60;

export function DailyBars({
  copy = defaultCopy.dashboard.usage.trend,
  days,
  locale = defaultLocale,
}: {
  copy?: AppCopy["dashboard"]["usage"]["trend"];
  days: Day[];
  locale?: Locale;
}) {
  const grouped = groupByDate(days);
  const series = lastNDays(latestDate(days) ?? utcToday(), TREND_DAYS).map((usageDate) => ({
    usageDate,
    totalTokens: grouped.get(usageDate) ?? 0,
  }));
  const max = Math.max(1, ...series.map((day) => day.totalTokens));
  const points = toPoints(series, max);
  const linePath = toLinePath(points);
  const areaPath = toAreaPath(points);
  const latest = series[series.length - 1];
  const previous = series[series.length - 2];
  const peak = [...series].sort(
    (a, b) => b.totalTokens - a.totalTokens || b.usageDate.localeCompare(a.usageDate),
  )[0];
  const hasData = series.some((day) => day.totalTokens > 0);

  return (
    <section className="tr-shell tr-reveal">
      <div className="tr-panel p-5">
        <div className="mb-5 flex flex-col gap-3 border-b border-[color:var(--tr-line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="tr-data-label">Velocity trace / 60D</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">{copy.title}</h2>
            <p className="mt-2 font-mono text-xs font-semibold text-[color:var(--tr-muted)]">
              {text(copy.subtitle, { count: TREND_DAYS })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] text-right font-mono text-xs font-semibold text-[color:var(--tr-muted)] sm:min-w-56">
            <Metric label={copy.latest} value={formatTokens(latest?.totalTokens ?? 0, locale)} />
            <Metric label={copy.peak} value={peak ? formatTokens(peak.totalTokens, locale) : "0"} />
          </div>
        </div>

        <div className="overflow-x-auto border border-[color:var(--tr-line)] bg-black/35 p-3 tr-scrollbar">
          <svg
            aria-label={copy.title}
            className="min-w-[760px]"
            role="img"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            <style>
              {`
                .trend-tooltip {
                  opacity: 0;
                  pointer-events: none;
                  transition: opacity 240ms cubic-bezier(0.32, 0.72, 0, 1);
                }

                .trend-point:hover .trend-tooltip,
                .trend-point:focus .trend-tooltip {
                  opacity: 1;
                }
              `}
            </style>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = PADDING_TOP + (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * ratio;

              return (
                <line
                  key={ratio}
                  stroke="rgba(214, 255, 63, 0.13)"
                  strokeWidth="1"
                  x1={PADDING_X}
                  x2={CHART_WIDTH - PADDING_X}
                  y1={y}
                  y2={y}
                />
              );
            })}

            {hasData ? (
              <>
                <path d={areaPath} fill="rgba(214, 255, 63, 0.12)" />
                <path d={linePath} fill="none" stroke="#d6ff3f" strokeWidth="3" />
                {points
                  .filter((point, index) => point.totalTokens > 0 || index === points.length - 1)
                  .map((point) => {
                    const tooltip = tooltipBox(point);
                    const exactTotal = formatInteger(point.totalTokens);

                    return (
                      <g
                        key={`${point.usageDate}-${point.totalTokens}`}
                        aria-label={`${point.usageDate}: ${exactTotal} Token`}
                        className="trend-point"
                        role="listitem"
                        tabIndex={0}
                      >
                        <circle cx={point.x} cy={point.y} fill="transparent" r="13" stroke="transparent" />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          fill={point.totalTokens > 0 ? "#ff5b35" : "#4a5048"}
                          r={point.totalTokens > 0 ? 4.5 : 3}
                        />
                        <g className="trend-tooltip" transform={`translate(${tooltip.x} ${tooltip.y})`}>
                          <rect fill="#080b07" height={tooltip.height} width={tooltip.width} />
                          <text fill="#858b80" fontSize="11" fontWeight="700" x="10" y="17">
                            {point.usageDate}
                          </text>
                          <text fill="#f2f1e8" fontSize="13" fontWeight="900" x="10" y="36">
                            {exactTotal} Token
                          </text>
                        </g>
                      </g>
                    );
                  })}
              </>
            ) : (
              <text
                fill="#858b80"
                fontSize="16"
                fontWeight="700"
                textAnchor="middle"
                x={CHART_WIDTH / 2}
                y={CHART_HEIGHT / 2}
              >
                {copy.noData}
              </text>
            )}
          </svg>
        </div>

        <div className="mt-3 grid gap-2 font-mono text-[0.65rem] font-semibold uppercase text-[color:var(--tr-muted)] sm:grid-cols-3">
          <span>{text(copy.range, { start: series[0]?.usageDate ?? "-", end: latest?.usageDate ?? "-" })}</span>
          <span>{text(copy.peakDate, { date: peak?.totalTokens ? peak.usageDate : copy.noPeak })}</span>
          <span>{text(copy.delta, { value: deltaLabel(latest?.totalTokens ?? 0, previous?.totalTokens ?? 0, copy.flat, locale) })}</span>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--tr-surface-2)] px-3 py-2">
      <div className="font-mono text-base font-black tabular-nums text-[color:var(--tr-ivory)]">{value}</div>
      <div className="mt-0.5">{label}</div>
    </div>
  );
}

function groupByDate(days: Day[]): Map<string, number> {
  const grouped = new Map<string, number>();

  for (const day of days) {
    grouped.set(day.usageDate, (grouped.get(day.usageDate) ?? 0) + day.totalTokens);
  }

  return grouped;
}

function toPoints(series: Day[], max: number): TrendDay[] {
  const innerWidth = CHART_WIDTH - PADDING_X * 2;
  const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const denominator = Math.max(1, series.length - 1);

  return series.map((day, index) => ({
    ...day,
    x: PADDING_X + (innerWidth * index) / denominator,
    y: PADDING_TOP + innerHeight - (day.totalTokens / max) * innerHeight,
  }));
}

function toLinePath(points: TrendDay[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`)
    .join(" ");
}

function toAreaPath(points: TrendDay[]): string {
  if (!points.length) return "";

  const baseline = CHART_HEIGHT - PADDING_BOTTOM;
  const line = toLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${line} L ${round(last.x)} ${baseline} L ${round(first.x)} ${baseline} Z`;
}

function tooltipBox(point: TrendDay): { x: number; y: number; width: number; height: number } {
  const width = 154;
  const height = 46;
  const x = clamp(point.x - width / 2, PADDING_X, CHART_WIDTH - PADDING_X - width);
  const y =
    point.y - height - 10 < PADDING_TOP
      ? Math.min(point.y + 12, CHART_HEIGHT - PADDING_BOTTOM - height)
      : point.y - height - 10;

  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
    width,
    height,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lastNDays(endDate: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(endDate);
    date.setUTCDate(endDate.getUTCDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

function latestDate(days: Day[]): Date | undefined {
  const latest = days
    .map((day) => new Date(`${day.usageDate}T00:00:00.000Z`).getTime())
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)[0];

  return latest ? new Date(latest) : undefined;
}

function deltaLabel(current: number, previous: number, flatLabel: string, locale: Locale): string {
  const delta = current - previous;

  if (delta === 0) return flatLabel;
  return `${delta > 0 ? "+" : ""}${formatTokens(delta, locale)}`;
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function round(value: number): string {
  return value.toFixed(1);
}
