import { Share2 } from "lucide-react";

import { ProfileAvatar } from "@/components/brand/profile-avatar";
import { boardLabel } from "@/components/leaderboard/board-tabs";
import { defaultLocale, type Locale } from "@/src/i18n/config";
import { defaultCopy, text, type AppCopy } from "@/src/i18n/copy";
import { formatTokens, formatUsdMicros } from "@/src/lib/format";
import { siteUrl } from "@/src/lib/site";
import {
  summarizeUsage,
  type DashboardUsageRow,
  type TokenBreakdown,
} from "@/src/lib/dashboard/summary";
import { TOOL_KEYS, type ToolKey } from "@/src/lib/types";

import { ActivityHeatmap } from "./activity-heatmap";
import { DailyBars } from "./daily-bars";

type Usage = DashboardUsageRow & {
  updatedAt?: Date | string;
};

type UsageCopy = AppCopy["dashboard"]["usage"];

export function UsageDashboard({
  actions = defaultCopy.common.buttons,
  avatarUrl,
  copy = defaultCopy.dashboard.usage,
  daily,
  handle,
  locale = defaultLocale,
  name,
}: {
  actions?: AppCopy["common"]["buttons"];
  avatarUrl?: string | null;
  copy?: UsageCopy;
  daily: Usage[];
  handle: string;
  locale?: Locale;
  name: string;
}) {
  const summary = summarizeUsage(daily);
  const todayTotal = totalForDate(daily, utcDateKey(new Date()));
  const latestSync = latestUpdatedAt(daily, locale);
  const topClient = summary.byClient[0];
  const topTool = summary.byTool[0];
  const topModel = summary.byModel[0];
  const shareText =
    locale === "zh"
      ? `我在 TokenRank 已经使用 ${formatTokens(summary.totalTokens, locale)} AI Token。`
      : `I have logged ${formatTokens(summary.totalTokens, locale)} AI tokens on TokenRank.`;
  const profileUrl = `${siteUrl}/u/${encodeURIComponent(handle)}`;
  const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(`${shareText}\n${profileUrl}`)}`;
  const summaryParts = [
    topClient ? text(copy.mainClient, { value: topClient.label }) : copy.noClient,
    topTool ? text(copy.mainTool, { value: toolName(topTool.key, locale) }) : "",
    topModel ? text(copy.mainModel, { value: topModel.label }) : "",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="tr-shell tr-reveal overflow-hidden">
        <div className="tr-panel grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-8">
            <ProfileMark avatarUrl={avatarUrl} name={name} />
            <div>
              <p className="tr-kicker">{copy.heroEyebrow}</p>
              <h1 className="tr-title mt-5 text-5xl sm:text-7xl">{name}</h1>
              <p className="mt-3 font-mono text-sm font-bold text-[color:var(--tr-gold)]">@{handle}</p>
              <p className="tr-body mt-5 max-w-3xl text-sm sm:text-base">{copy.heroBody}</p>
            </div>
          </div>
          <div className="border-t border-[color:var(--tr-line)] bg-[color:var(--tr-gold)] p-6 text-[#080b07] lg:border-l lg:border-t-0">
            <p className="font-mono text-[0.65rem] font-black uppercase tracking-[0.16em]">
              {copy.totalOverview}
            </p>
            <div className="mt-4 font-mono text-4xl font-black tabular-nums sm:text-5xl">
              {formatTokens(summary.totalTokens, locale)}
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-black/65">
              {summaryParts.join(locale === "zh" ? " · " : " / ")}
            </p>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-black bg-[#080b07] px-4 font-mono text-xs font-black uppercase text-[color:var(--tr-gold)] transition hover:bg-[color:var(--tr-orange)] hover:text-[#080b07]"
            >
              <Share2 className="size-4" aria-hidden="true" />
              {actions.shareToX}
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] sm:grid-cols-2 xl:grid-cols-6">
        <Stat label={copy.stats.total} value={formatTokens(summary.totalTokens, locale)} hint={text(copy.stats.rows, { count: summary.uploadRows })} />
        <Stat
          label={copy.stats.today}
          value={formatTokens(todayTotal, locale)}
          hint={latestSync ? text(copy.stats.latestSync, { value: latestSync }) : copy.stats.waitingSync}
        />
        <Stat
          label={copy.stats.spend}
          value={formatUsdMicros(summary.estimatedCostMicros)}
          hint={summary.lastDate ? text(copy.stats.latestDate, { value: summary.lastDate }) : copy.stats.noDate}
        />
        <Stat
          label={copy.stats.activeDays}
          value={`${summary.activeDays}`}
          hint={text(copy.stats.activeAverage, { value: formatTokens(summary.averageActiveDayTokens, locale) })}
        />
        <Stat
          label={copy.stats.clients}
          value={`${summary.uploadedClients}`}
          hint={topClient ? text(copy.stats.clientHint, { label: topClient.label, value: formatTokens(topClient.totalTokens, locale) }) : copy.stats.noClient}
        />
        <Stat label={copy.stats.mix} value={tokenMixValue(summary, copy, locale)} hint={tokenMixHint(summary, copy, locale)} />
      </section>

      <ActivityHeatmap copy={copy.heatmap} days={summary.byDate} locale={locale} />
      <DailyBars copy={copy.trend} days={summary.byDate} locale={locale} />

      <section className="grid gap-4 xl:grid-cols-3">
        <Breakdown copy={copy.breakdown} title={copy.breakdown.byClient} items={summary.byClient.slice(0, 10)} locale={locale} />
        <Breakdown
          copy={copy.breakdown}
          title={copy.breakdown.byTool}
          items={summary.byTool.slice(0, 10)}
          locale={locale}
          labelForItem={(item) => toolName(item.key, locale)}
        />
        <Breakdown
          copy={copy.breakdown}
          title={copy.breakdown.byModel}
          items={summary.byModel.slice(0, 10)}
          locale={locale}
          labelForItem={(item) => modelBreakdownName(item, locale, copy)}
        />
      </section>

      <DailyDetailTable copy={copy.table} locale={locale} rows={daily.slice(0, 120)} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="tr-reveal min-h-36 bg-[color:var(--tr-surface)] p-5">
      <div className="tr-data-label">{label}</div>
      <div className="tr-data-value mt-4 text-2xl text-[color:var(--tr-ivory)]">{value}</div>
      {hint ? <div className="mt-4 text-xs leading-5 text-[color:var(--tr-muted)]">{hint}</div> : null}
    </div>
  );
}

function Breakdown({
  copy,
  items,
  locale,
  labelForItem = (item) => item.label,
  title,
}: {
  copy: UsageCopy["breakdown"];
  items: TokenBreakdown[];
  locale: Locale;
  labelForItem?: (item: TokenBreakdown) => string;
  title: string;
}) {
  return (
    <section className="tr-shell tr-reveal">
      <div className="tr-panel p-5">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--tr-line)] pb-4">
          <h2 className="font-display text-2xl font-bold uppercase tracking-[-0.025em] text-[color:var(--tr-ivory)]">{title}</h2>
          <span className="tr-chip">{text(copy.top, { count: Math.min(items.length, 10) })}</span>
        </div>
        <div className="mt-4 h-[23.375rem] overflow-y-auto pr-2 tr-scrollbar">
          {items.length ? (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.key} className="grid min-h-[3.75rem] content-start gap-2">
                  <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                    <span className="flex size-7 items-center justify-center bg-[color:var(--tr-surface-2)] font-mono text-xs font-black text-[color:var(--tr-muted)]">
                      {index + 1}
                    </span>
                    <span className="truncate font-bold text-[color:var(--tr-ivory)]">{labelForItem(item)}</span>
                    <span className="shrink-0 tabular-nums text-[color:var(--tr-muted)]">
                      {formatTokens(item.totalTokens, locale)}
                    </span>
                  </div>
                  <div className="ml-10 grid gap-1">
                    <div className="h-1.5 overflow-hidden bg-black/35">
                      <div
                        className="h-full bg-[color:var(--tr-gold)]"
                        style={{ width: `${Math.max(2, item.share * 100)}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[color:var(--tr-muted)]">
                      <span>{formatPercent(item.share)}</span>
                      <span>{text(copy.activeDays, { count: item.activeDays })}</span>
                      <span>{text(copy.rows, { count: item.rows })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center border border-dashed border-[color:var(--tr-line)] bg-black/20 p-5 text-center text-sm font-semibold text-[color:var(--tr-muted)]">
              {copy.empty}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DailyDetailTable({ copy, locale, rows }: { copy: UsageCopy["table"]; locale: Locale; rows: Usage[] }) {
  if (!rows.length) {
    return (
      <section className="tr-shell tr-reveal">
        <div className="tr-panel p-8 text-center text-sm text-[color:var(--tr-muted)]">{copy.empty}</div>
      </section>
    );
  }

  return (
    <section className="tr-shell tr-reveal overflow-hidden">
      <div className="tr-panel overflow-hidden">
        <div className="border-b border-[color:var(--tr-line)] bg-black/10 px-5 py-5">
          <h2 className="font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">{copy.title}</h2>
          <p className="mt-1 text-xs font-semibold text-[color:var(--tr-muted)]">{copy.subtitle}</p>
        </div>
        <div className="h-[30.625rem] overflow-auto tr-scrollbar xl:h-[30rem]">
          <table className="w-full min-w-[1080px] whitespace-nowrap text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#090c09] font-mono text-[0.62rem] font-black uppercase tracking-[0.12em] text-[color:var(--tr-muted)] shadow-[0_1px_0_var(--tr-line)]">
              <tr>
                <th className="h-10 px-5">{copy.date}</th>
                <th className="h-10 px-5">{copy.client}</th>
                <th className="h-10 px-5">{copy.tool}</th>
                <th className="h-10 px-5">{copy.model}</th>
                <th className="h-10 px-5 text-right">{copy.input}</th>
                <th className="h-10 px-5 text-right">{copy.output}</th>
                <th className="h-10 px-5 text-right">{copy.cache}</th>
                <th className="h-10 px-5 text-right">{copy.token}</th>
                <th className="h-10 px-5 text-right">{copy.spend}</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-black/10">
              {rows.map((row, index) => (
                <tr
                  key={`${row.usageDate}-${row.deviceId ?? "client"}-${row.tool}-${row.model}-${index}`}
                  className="hover:bg-[color:var(--tr-gold)]/8"
                >
                  <td className="h-11 px-5 font-bold text-[color:var(--tr-ivory)]">{row.usageDate}</td>
                  <td className="h-11 px-5 text-[color:var(--tr-muted)]">{clientName(row, copy)}</td>
                  <td className="h-11 px-5 text-[color:var(--tr-muted)]">{toolName(row.tool, locale)}</td>
                  <td className="h-11 px-5 text-[color:var(--tr-muted)]">{modelName(row.model, row.tool, locale, copy)}</td>
                  <td className="h-11 px-5 text-right tabular-nums text-[color:var(--tr-muted)]">
                    {formatOptionalTokens(row.inputTokens, locale)}
                  </td>
                  <td className="h-11 px-5 text-right tabular-nums text-[color:var(--tr-muted)]">
                    {formatOptionalTokens(row.outputTokens, locale)}
                  </td>
                  <td className="h-11 px-5 text-right tabular-nums text-[color:var(--tr-muted)]">
                    {formatOptionalTokens(optionalSum(row.cacheReadTokens, row.cacheWriteTokens), locale)}
                  </td>
                  <td className="h-11 px-5 text-right font-black tabular-nums text-[color:var(--tr-ivory)]">
                    {formatTokens(row.totalTokens, locale)}
                  </td>
                  <td className="h-11 px-5 text-right tabular-nums text-[color:var(--tr-muted)]">
                    {formatUsdMicros(row.estimatedCostMicros)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProfileMark({ avatarUrl, name }: { avatarUrl?: string | null; name: string }) {
  return (
    <ProfileAvatar
      className="size-24 border-4 border-[color:var(--tr-gold)] sm:size-28"
      fallbackTextClassName="font-display text-5xl font-bold"
      name={name}
      src={avatarUrl}
    />
  );
}

function totalForDate(rows: Usage[], date: string): number {
  return rows
    .filter((row) => row.usageDate === date)
    .reduce((sum, row) => sum + row.totalTokens, 0);
}

function latestUpdatedAt(rows: Usage[], locale: Locale): string | undefined {
  const latest = rows
    .map((row) => (row.updatedAt ? new Date(row.updatedAt).getTime() : 0))
    .filter((time) => Number.isFinite(time) && time > 0)
    .sort((a, b) => b - a)[0];

  return latest
    ? new Date(latest).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { hour12: false })
    : undefined;
}

function toolName(value: string, locale: Locale): string {
  return (TOOL_KEYS as readonly string[]).includes(value) ? boardLabel(value as ToolKey, locale) : value;
}

function modelBreakdownName(item: TokenBreakdown, locale: Locale, copy: UsageCopy): string {
  const tool = item.key.startsWith("unattributed:") ? item.key.slice("unattributed:".length) : null;
  return tool ? `${copy.table.unknownModel} · ${toolName(tool, locale)}` : item.label;
}

function modelName(value: string, tool: string, locale: Locale, copy: UsageCopy["table"]): string {
  const model = value.trim();
  const normalized = model.toLowerCase();

  if (!model || normalized === "unknown" || normalized === `${tool}-unattributed`) {
    return `${copy.unknownModel} · ${toolName(tool, locale)}`;
  }

  return model;
}

function clientName(row: Usage, copy: UsageCopy["table"]): string {
  const label = row.deviceLabel?.trim();
  const deviceId = row.deviceId?.trim();

  if (label) return label;
  if (deviceId) return `${copy.clientPrefix} ${deviceId.length > 8 ? deviceId.slice(0, 8) : deviceId}`;
  return copy.unknownClient;
}

function tokenMixValue(summary: ReturnType<typeof summarizeUsage>, copy: UsageCopy, locale: Locale = defaultLocale): string {
  const knownTokens = summary.inputTokens + summary.outputTokens + summary.cacheTokens;

  if (knownTokens === 0) return copy.stats.notProvided;
  return `${formatTokens(summary.inputTokens, locale)} / ${formatTokens(summary.outputTokens, locale)}`;
}

function tokenMixHint(summary: ReturnType<typeof summarizeUsage>, copy: UsageCopy, locale: Locale = defaultLocale): string {
  const knownTokens = summary.inputTokens + summary.outputTokens + summary.cacheTokens;

  if (knownTokens === 0) return copy.stats.waitingBreakdown;
  return `${copy.stats.inputOutput}, ${text(copy.stats.cache, { value: formatTokens(summary.cacheTokens, locale) })}`;
}

function formatOptionalTokens(value: number | null | undefined, locale: Locale = defaultLocale): string {
  return typeof value === "number" && Number.isFinite(value) ? formatTokens(value, locale) : "-";
}

function optionalSum(first: number | null | undefined, second: number | null | undefined): number | undefined {
  const values = [first, second].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  return values.length ? values.reduce((sum, value) => sum + value, 0) : undefined;
}

function formatPercent(value: number): string {
  const percent = value * 100;

  if (percent > 0 && percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}

function utcDateKey(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}
