import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { UsageDashboard } from "@/components/dashboard/usage-dashboard";
import { JsonLd } from "@/components/seo/json-ld";
import { getCopy } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";
import { summarizeUsage } from "@/src/lib/dashboard/summary";
import { buildCompetitiveContext } from "@/src/lib/dashboard/competitive-context";
import { formatTokens } from "@/src/lib/format";
import { absoluteUrl } from "@/src/lib/site";
import { createSocialMetadata } from "@/src/lib/social-metadata";
import { getLeaderboard, getProfile } from "@/src/lib/users";

const getCachedProfile = cache(getProfile);

type PublicProfileProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: PublicProfileProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getCachedProfile(handle);

  if (!profile) {
    return {
      title: "User not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { canonical, description, title } = profileSeo(profile);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    ...createSocialMetadata({
      title,
      description,
      url: canonical,
      type: "profile",
    }),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PublicProfilePage({ params }: PublicProfileProps) {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const { handle } = await params;
  const profile = await getCachedProfile(handle);

  if (!profile) notFound();
  const leaderboard = profile.user.rankingEnabled
    ? await getLeaderboard("total", "7d")
    : [];
  const competitive = buildCompetitiveContext({
    daily: profile.daily,
    leaderboard,
    userId: profile.user.id,
  });
  const { canonical, description, title } = profileSeo(profile);
  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: title,
    description,
    url: canonical,
    mainEntity: {
      "@type": "Person",
      name: profile.user.name,
      alternateName: `@${profile.user.handle}`,
      url: canonical,
      ...(profile.user.avatarUrl ? { image: profile.user.avatarUrl } : {}),
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "zh" ? "榜单" : "Leaderboard",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: profile.user.name,
        item: canonical,
      },
    ],
  };

  return (
    <main className="tr-page w-full flex-1">
      <JsonLd data={profileJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <section className="tr-container py-8 sm:py-12 lg:py-16">
        <nav aria-label={locale === "zh" ? "面包屑" : "Breadcrumb"} className="mb-5 font-mono text-xs font-bold uppercase text-[color:var(--tr-muted)]">
          <Link href="/" className="hover:text-[color:var(--tr-gold)]">
            {locale === "zh" ? "榜单" : "Leaderboard"}
          </Link>
          <span className="px-2 text-[color:var(--tr-line-strong)]" aria-hidden="true">/</span>
          <span aria-current="page">@{profile.user.handle}</span>
        </nav>
        <div className="tr-live-tape tr-reveal">
          <span>Public athlete record</span>
          <span>@{profile.user.handle}</span>
        </div>
        <div className="mt-6">
        <UsageDashboard
          actions={copy.common.buttons}
          avatarUrl={profile.user.avatarUrl}
          copy={copy.dashboard.usage}
          competitive={competitive}
          daily={profile.daily}
          handle={profile.user.handle}
          locale={locale}
          name={profile.user.name}
        />
        </div>
      </section>
    </main>
  );
}

function profileSeo(profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>) {
  const summary = summarizeUsage(profile.daily);
  const canonical = absoluteUrl(`/u/${encodeURIComponent(profile.user.handle)}`);
  const title = `${profile.user.name}'s AI Token Usage (@${profile.user.handle})`;
  const description = summary.totalTokens
    ? `${profile.user.name} has logged ${formatTokens(summary.totalTokens, "en")} aggregate AI tokens on TokenRank. View daily activity, top tools, models, and estimated cost.`
    : `View ${profile.user.name}'s aggregate AI token usage, daily activity, top tools, models, and estimated cost on TokenRank.`;

  return { canonical, description, title };
}
