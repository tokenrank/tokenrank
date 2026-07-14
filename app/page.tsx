import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Trophy } from "lucide-react";

import { HomeAnswerStrip } from "@/components/home/home-answer-strip";
import { boardLabel, BoardTabs } from "@/components/leaderboard/board-tabs";
import { LeaderboardShare } from "@/components/leaderboard/leaderboard-share";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { rangeLabel, RangeTabs } from "@/components/leaderboard/range-tabs";
import { JsonLd } from "@/components/seo/json-ld";
import { defaultLocale, htmlLang } from "@/src/i18n/config";
import { getCopy, text } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";
import { formatTokens, formatUsdMicros } from "@/src/lib/format";
import { parseLeaderboardSearchParams } from "@/src/lib/leaderboard/search-params";
import { absoluteUrl, siteName, siteUrl } from "@/src/lib/site";
import type { LeaderboardEntry } from "@/src/lib/types";
import { getLeaderboard } from "@/src/lib/users";

const metadataCopy = getCopy(defaultLocale).home;

export const metadata: Metadata = {
  title: {
    absolute: metadataCopy.metaTitle,
  },
  description: metadataCopy.metaDescription,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: metadataCopy.metaTitle,
    description: metadataCopy.metaDescription,
    url: absoluteUrl("/"),
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: metadataCopy.metaTitle,
    description: metadataCopy.metaDescription,
  },
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; range?: string }>;
}) {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const params = await searchParams;
  const { board, range } = parseLeaderboardSearchParams(params);
  const entries: LeaderboardEntry[] = process.env.DATABASE_URL
    ? await getLeaderboard(board, range)
    : [];
  const leader = entries[0];
  const activeBoard = boardLabel(board, locale);
  const activeRange = rangeLabel(range, locale);
  const leaderScore = leader
    ? board === "cost"
      ? formatUsdMicros(leader.score)
      : formatTokens(leader.score, locale)
    : copy.home.stats.waitingScore;
  const shareText = leader
    ? text(copy.home.share.leader, {
        board: activeBoard,
        handle: leader.handle,
        name: leader.name,
        range: activeRange,
        score: leaderScore,
      })
    : text(copy.home.share.empty, { board: activeBoard, range: activeRange });
  const shareUrl = `${siteUrl}/?board=${board}&range=${range}`;
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: "AI Token Leaderboard",
    url: siteUrl,
    description: copy.home.metaDescription,
    inLanguage: htmlLang(locale),
  };
  const leaderboardJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.home.metaTitle,
    description: copy.home.metaDescription,
    url: absoluteUrl("/"),
    mainEntity: {
      "@type": "ItemList",
      name: `${activeRange} ${activeBoard} leaderboard`,
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${entry.name} (@${entry.handle})`,
        url: absoluteUrl(`/u/${encodeURIComponent(entry.handle)}`),
      })),
    },
  };

  return (
    <main className="tr-page w-full flex-1">
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={leaderboardJsonLd} />
      <section className="tr-container pb-8 pt-5 sm:pb-10 sm:pt-8 lg:pt-10">
        <div className="tr-live-tape tr-reveal">
          <span>Live board // {activeBoard}</span>
          <span>
            {activeRange} {"//"} {String(entries.length).padStart(3, "0")}
          </span>
        </div>

        <div className="grid border-x border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.7fr)]">
          <div className="relative min-h-[34rem] overflow-hidden border-b border-[color:var(--tr-line)] p-6 sm:p-9 lg:border-b-0 lg:border-r lg:p-12">
            <span className="tr-page-number" aria-hidden="true">
              01
            </span>
            <div className="relative z-10 flex h-full max-w-5xl flex-col justify-between">
              <div>
                <p className="tr-kicker">{copy.home.hero.eyebrow}</p>
                <h1
                  className={`tr-title mt-8 max-w-5xl ${
                    locale === "zh"
                      ? "whitespace-pre text-[clamp(2.5rem,7vw,6.5rem)]"
                      : "whitespace-pre-line text-[clamp(4rem,10vw,9.5rem)]"
                  }`}
                >
                  {copy.home.hero.title}
                </h1>
                <p className="tr-body mt-7 max-w-2xl text-base sm:text-lg">
                  {copy.home.hero.body}
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/onboard" className="tr-button">
                  {copy.home.hero.primary}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="#leaderboard" className="tr-button-secondary">
                  <Trophy className="size-4" aria-hidden="true" />
                  {copy.home.hero.secondary}
                </Link>
              </div>
            </div>
          </div>

          <div className="grid content-between gap-5 p-5 sm:p-7">
            <div>
              <div className="flex items-center justify-between border-b border-[color:var(--tr-line)] pb-3">
                <p className="tr-data-label">Signal / 001</p>
                <Trophy className="size-5 text-[color:var(--tr-orange)]" aria-hidden="true" />
              </div>
              <div className="mt-5">
                <p className="tr-data-label">{copy.home.stats.leader}</p>
                <p className="tr-data-value mt-2 text-4xl text-[color:var(--tr-gold)] sm:text-5xl">
                  {leaderScore}
                </p>
                <p className="mt-3 text-sm font-bold text-[color:var(--tr-ivory-soft)]">
                  {leader
                    ? `${leader.name} @${leader.handle}`
                    : copy.home.stats.waitingIdentity}
                </p>
              </div>
            </div>

            <LeaderboardShare copy={copy.home.share} shareText={shareText} shareUrl={shareUrl} />
          </div>
        </div>

        <HomeAnswerStrip copy={copy.home.answer} />

        <div className="grid border-x border-b border-[color:var(--tr-line)] bg-[#0a0d0a] sm:grid-cols-3">
          <ScoreDatum label={copy.home.stats.leader} value={leaderScore} />
          <ScoreDatum
            label={copy.home.stats.identity}
            value={leader ? `@${leader.handle}` : copy.home.stats.waitingIdentity}
          />
          <ScoreDatum
            label={copy.home.stats.scope}
            value={`${activeRange} / ${activeBoard} / ${text(copy.home.stats.users, { count: entries.length })}`}
          />
        </div>
      </section>

      <section id="leaderboard" className="tr-container pb-5">
        <div className="tr-shell tr-reveal overflow-visible">
          <div className="tr-panel grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="size-4 text-[color:var(--tr-gold)]" aria-hidden="true" />
                <span className="tr-data-label">{copy.home.controls.board}</span>
              </div>
              <BoardTabs active={board} locale={locale} range={range} />
            </div>
            <div>
              <div className="mb-3 tr-data-label">{copy.home.controls.range}</div>
              <RangeTabs active={range} board={board} locale={locale} />
            </div>
          </div>
        </div>
      </section>

      <section className="tr-container pb-12 sm:pb-16">
        <LeaderboardTable board={board} copy={copy.home.table} entries={entries} locale={locale} />
      </section>

      <section id="how-it-works" className="tr-container pb-12 sm:pb-16" aria-labelledby="how-title">
        <SectionHeading eyebrow={copy.home.how.eyebrow} id="how-title" title={copy.home.how.title} />
        <div className="grid gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] lg:grid-cols-3">
          {copy.home.how.steps.map((step, index) => (
            <article key={step.title} className="tr-reveal bg-[color:var(--tr-surface)] p-6 sm:p-8">
              <p className="font-display text-5xl font-bold text-[color:var(--tr-muted)]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-8 font-display text-2xl font-bold uppercase tracking-[-0.025em] text-[color:var(--tr-ivory)]">
                {step.title}
              </h3>
              <p className="tr-body mt-4 text-sm">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="tr-container pb-12 sm:pb-16" aria-labelledby="faq-title">
        <SectionHeading eyebrow={copy.home.faq.eyebrow} id="faq-title" title={copy.home.faq.title} />
        <div className="border-x border-[color:var(--tr-line)]">
          {copy.home.faq.items.map((item, index) => (
            <article
              key={item.question}
              className="tr-reveal grid gap-4 border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] p-5 sm:grid-cols-[5rem_minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-7 sm:p-7"
            >
              <span className="tr-rule-index">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-2xl font-bold uppercase leading-tight tracking-[-0.025em] text-[color:var(--tr-ivory)]">
                {item.question}
              </h3>
              <p className="text-sm leading-7 text-[color:var(--tr-muted)]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="tr-container pb-16 sm:pb-20" aria-labelledby="explore-title">
        <SectionHeading eyebrow={copy.home.explore.eyebrow} id="explore-title" title={copy.home.explore.title} />
        <div className="grid gap-3 lg:grid-cols-3">
          {copy.home.explore.links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="tr-reveal group border border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] p-6 hover:border-[color:var(--tr-gold)] hover:bg-[color:var(--tr-surface-3)]"
            >
              <h3 className="font-display text-2xl font-bold uppercase tracking-[-0.025em] text-[color:var(--tr-ivory)] group-hover:text-[color:var(--tr-gold)]">
                {item.title}
              </h3>
              <p className="tr-body mt-3 text-sm">{item.body}</p>
              <span className="mt-6 inline-flex items-center gap-2 font-mono text-xs font-black uppercase text-[color:var(--tr-gold)]">
                {item.href}
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function SectionHeading({ eyebrow, id, title }: { eyebrow: string; id: string; title: string }) {
  return (
    <div className="mb-6 border-b border-[color:var(--tr-line-strong)] pb-5">
      <p className="tr-data-label">{eyebrow}</p>
      <h2
        id={id}
        className="mt-2 font-display text-4xl font-bold uppercase tracking-[-0.035em] text-[color:var(--tr-ivory)] sm:text-5xl"
      >
        {title}
      </h2>
    </div>
  );
}

function ScoreDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[color:var(--tr-line)] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:p-5">
      <p className="tr-data-label">{label}</p>
      <p className="tr-data-value mt-2 truncate text-base text-[color:var(--tr-ivory)]">{value}</p>
    </div>
  );
}
