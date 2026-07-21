import Link from "next/link";
import type { ReactNode } from "react";

import { ProfileAvatar } from "@/components/brand/profile-avatar";
import { boardLabel } from "@/components/leaderboard/board-tabs";
import { defaultLocale, type Locale } from "@/src/i18n/config";
import type { AppCopy } from "@/src/i18n/copy";
import { text } from "@/src/i18n/copy";
import { formatTokens, formatUsdMicros } from "@/src/lib/format";
import { TOOL_KEYS, type BoardKey, type LeaderboardEntry, type ToolKey } from "@/src/lib/types";

export function LeaderboardTable({
  board,
  controls,
  copy,
  entries,
  locale = defaultLocale,
}: {
  board: BoardKey;
  controls?: ReactNode;
  copy: AppCopy["home"]["table"];
  entries: LeaderboardEntry[];
  locale?: Locale;
}) {
  if (!entries.length) {
    return (
      <section className="tr-shell tr-reveal flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="tr-live-tape">
          <span>Position available</span>
          <span>Rank / 001</span>
        </div>
        <div className="tr-panel flex min-h-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-[color:var(--tr-line)] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">
                  {copy.title}
                </h2>
                <p className="mt-1 font-mono text-xs text-[color:var(--tr-muted)]">{copy.subtitle}</p>
              </div>
              <p className="tr-data-label">{copy.dataFeed}</p>
            </div>
            {controls ? <div className="mt-4 border-t border-[color:var(--tr-line)] pt-4">{controls}</div> : null}
          </header>
          <div className="grid min-h-[20rem] flex-1 place-items-center p-8 text-center">
            <div>
              <div className="font-display text-[7rem] font-bold leading-none text-[color:var(--tr-line)] sm:text-[10rem]">
                001
              </div>
              <h3 className="tr-title -mt-4 text-4xl sm:text-5xl">{copy.emptyTitle}</h3>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[color:var(--tr-muted)]">
                {copy.emptyBody}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const scoreLabel =
    board === "cost" ? copy.spendScore : text(copy.tokenScore, { board: boardLabel(board, locale) });

  return (
    <section className="tr-shell tr-reveal flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="tr-live-tape">
        <span>{copy.title}</span>
        <span>{text(copy.count, { count: entries.length })}</span>
      </div>
      <div className="tr-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-[color:var(--tr-line)] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">
                {copy.title}
              </h2>
              <p className="mt-1 font-mono text-xs text-[color:var(--tr-muted)]">{copy.subtitle}</p>
            </div>
            <p className="tr-data-label">{copy.dataFeed}</p>
          </div>
          {controls ? <div className="mt-4 border-t border-[color:var(--tr-line)] pt-4">{controls}</div> : null}
        </header>

        <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3 tr-scrollbar md:hidden">
          {entries.map((entry) => (
            <article
              key={entry.userId}
              className="border border-[color:var(--tr-line)] bg-[#0a0d0a] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <RankBadge rank={entry.rank} />
                <div className="text-right">
                  <div className="tr-data-label">{scoreLabel}</div>
                  <div className="tr-data-value mt-1 text-2xl text-[color:var(--tr-ivory)]">
                    {score(entry, board, locale)}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex min-w-0 items-center gap-3 border-t border-[color:var(--tr-line)] pt-4">
                <Avatar entry={entry} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${entry.handle}`}
                    className="block truncate text-base font-black text-[color:var(--tr-ivory)] hover:text-[color:var(--tr-gold)]"
                  >
                    {entry.name}
                  </Link>
                  <div className="mt-0.5 truncate font-mono text-xs text-[color:var(--tr-muted)]">
                    @{entry.handle}
                  </div>
                </div>
                <div className="font-mono text-xs text-[color:var(--tr-muted)]">
                  {formatUsdMicros(entry.estimatedCostMicros)}
                </div>
              </div>
              <div className="mt-4">
                <ToolBreakdown byTool={entry.byTool} copy={copy} locale={locale} />
              </div>
            </article>
          ))}
        </div>

        <div className="hidden min-h-0 flex-1 overflow-auto tr-scrollbar md:block">
          <table className="h-full w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-[#090b09] font-mono text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[color:var(--tr-muted)]">
              <tr className="border-b border-[color:var(--tr-line)]">
                <th className="w-24 px-5 py-3">{copy.rank}</th>
                <th className="px-5 py-3">{copy.identity}</th>
                <th className="px-5 py-3 text-right">{scoreLabel}</th>
                <th className="px-5 py-3 text-right">{copy.spend}</th>
                <th className="px-5 py-3">{copy.topTools}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.userId}
                  className="group border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] last:border-b-0 hover:bg-[color:var(--tr-surface-3)]"
                >
                  <td className="px-5 py-4 align-middle">
                    <RankBadge rank={entry.rank} />
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar entry={entry} />
                      <div className="min-w-0">
                        <Link
                          href={`/u/${entry.handle}`}
                          className="block truncate font-black text-[color:var(--tr-ivory)] hover:text-[color:var(--tr-gold)]"
                        >
                          {entry.name}
                        </Link>
                        <div className="truncate font-mono text-xs text-[color:var(--tr-muted)]">
                          @{entry.handle}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right align-middle">
                    <span className="tr-data-value text-xl text-[color:var(--tr-ivory)]">
                      {score(entry, board, locale)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right align-middle font-mono text-xs text-[color:var(--tr-muted)]">
                    {formatUsdMicros(entry.estimatedCostMicros)}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <ToolBreakdown byTool={entry.byTool} copy={copy} locale={locale} />
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

function RankBadge({ rank }: { rank: number }) {
  const className =
    rank === 1
      ? "bg-[color:var(--tr-gold)] text-[#080b07]"
      : rank === 2
        ? "bg-[color:var(--tr-ivory)] text-[#080b07]"
        : rank === 3
          ? "bg-[color:var(--tr-orange)] text-[#080b07]"
          : "border border-[color:var(--tr-line)] bg-[color:var(--tr-surface-2)] text-[color:var(--tr-muted)]";

  return (
    <span className={`inline-flex h-9 min-w-14 items-center justify-center px-2 font-mono text-sm font-black ${className}`}>
      #{String(rank).padStart(2, "0")}
    </span>
  );
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  return (
    <ProfileAvatar
      className="size-11 shrink-0"
      fallbackTextClassName="font-display text-xl font-bold"
      name={entry.name}
      src={entry.avatarUrl}
    />
  );
}

function ToolBreakdown({
  byTool,
  copy,
  locale,
}: {
  byTool: Record<ToolKey, number>;
  copy: AppCopy["home"]["table"];
  locale: Locale;
}) {
  const topTools = TOOL_KEYS.map((tool) => ({ tool, value: byTool[tool] }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  if (!topTools.length) {
    return <span className="font-mono text-xs text-[color:var(--tr-muted)]">{copy.noTools}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {topTools.map((item, index) => (
        <span
          key={item.tool}
          className="inline-flex items-center gap-1.5 border border-[color:var(--tr-line)] bg-[#0a0d0a] px-2 py-1 font-mono text-[0.65rem] font-bold text-[color:var(--tr-ivory-soft)]"
        >
          <span
            className={index === 0 ? "size-1.5 bg-[color:var(--tr-gold)]" : "size-1.5 bg-[color:var(--tr-line-strong)]"}
          />
          {boardLabel(item.tool, locale)} {formatTokens(item.value, locale)}
        </span>
      ))}
    </div>
  );
}

function score(entry: LeaderboardEntry, board: BoardKey, locale: Locale): string {
  return board === "cost" ? formatUsdMicros(entry.score) : formatTokens(entry.score, locale);
}
