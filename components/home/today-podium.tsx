import Link from "next/link";

import { ProfileAvatar } from "@/components/brand/profile-avatar";
import { LeaderboardShare } from "@/components/leaderboard/leaderboard-share";
import type { Locale } from "@/src/i18n/config";
import type { AppCopy } from "@/src/i18n/copy";
import { formatTokens } from "@/src/lib/format";
import type { LeaderboardEntry } from "@/src/lib/types";

const PODIUM_ORDER = [1, 0, 2] as const;

export function TodayPodium({
  copy,
  entries,
  locale,
  shareCopy,
  shareText,
  shareUrl,
}: {
  copy: AppCopy["home"]["podium"];
  entries: LeaderboardEntry[];
  locale: Locale;
  shareCopy: AppCopy["home"]["share"];
  shareText: string;
  shareUrl: string;
}) {
  const topThree = entries.slice(0, 3);

  return (
    <section className="relative flex h-full min-h-[30rem] flex-col bg-[#090c09] p-5 sm:p-7" aria-labelledby="today-podium-title">
      <header className="flex items-start justify-between gap-4 border-b border-[color:var(--tr-line)] pb-4">
        <div>
          <p className="tr-data-label">{copy.eyebrow}</p>
          <h2
            id="today-podium-title"
            className="mt-1 font-display text-3xl font-bold uppercase tracking-[-0.035em] text-[color:var(--tr-ivory)]"
          >
            {copy.title}
          </h2>
        </div>
        <LeaderboardShare
          compact
          copy={shareCopy}
          shareText={shareText}
          shareUrl={shareUrl}
        />
      </header>

      <div className="mt-6 grid flex-1 grid-cols-3 items-end gap-2 sm:gap-3">
        {PODIUM_ORDER.map((entryIndex) => {
          const entry = topThree[entryIndex];
          const rank = entryIndex + 1;
          const label = [copy.first, copy.second, copy.third][entryIndex];

          return (
            <article
              key={entry?.userId ?? rank}
              className={`group flex min-w-0 flex-col border border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] p-3 transition-colors hover:border-[color:var(--tr-gold)] sm:p-4 ${
                rank === 1 ? "min-h-[17rem]" : rank === 2 ? "min-h-[14rem]" : "min-h-[12rem]"
              }`}
            >
              <div className="flex flex-col items-start gap-1">
                <span
                  className={`font-display text-4xl font-bold leading-none ${
                    rank === 1
                      ? "text-[color:var(--tr-gold)]"
                      : rank === 2
                        ? "text-[color:var(--tr-ivory)]"
                        : "text-[color:var(--tr-orange)]"
                  }`}
                >
                  {String(rank).padStart(2, "0")}
                </span>
                <span className="tr-data-label max-w-full break-words leading-tight">{label}</span>
              </div>

              {entry ? (
                <div className="mt-auto pt-5">
                  <ProfileAvatar
                    className="size-10 sm:size-12"
                    fallbackTextClassName="font-display text-xl font-bold"
                    name={entry.name}
                    src={entry.avatarUrl}
                  />
                  <Link
                    href={`/u/${entry.handle}`}
                    className="mt-3 block truncate text-sm font-black text-[color:var(--tr-ivory)] hover:text-[color:var(--tr-gold)] sm:text-base"
                  >
                    {entry.name}
                  </Link>
                  <p className="mt-0.5 truncate font-mono text-[0.62rem] text-[color:var(--tr-muted)] sm:text-xs">
                    @{entry.handle}
                  </p>
                  <p className="tr-data-value mt-3 truncate text-sm text-[color:var(--tr-ivory)] sm:text-lg">
                    {formatTokens(entry.score, locale)}
                  </p>
                </div>
              ) : (
                <div className="mt-auto pt-5">
                  <div className="size-10 border border-dashed border-[color:var(--tr-line-strong)] sm:size-12" />
                  <p className="mt-3 font-mono text-xs font-bold uppercase text-[color:var(--tr-muted)]">
                    {copy.open}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
