import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { UsageDashboard } from "@/components/dashboard/usage-dashboard";
import { getCopy } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";
import { getProfile } from "@/src/lib/users";

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

  const title = `${profile.user.name} (@${profile.user.handle}) on TokenRank`;
  const description = `Public aggregate AI coding token stats for ${profile.user.name} on TokenRank.`;
  const canonical = `/u/${profile.user.handle}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: PublicProfileProps) {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const { handle } = await params;
  const profile = await getCachedProfile(handle);

  if (!profile) notFound();

  return (
    <main className="tr-page w-full flex-1">
      <section className="tr-container py-8 sm:py-12 lg:py-16">
        <div className="tr-live-tape tr-reveal">
          <span>Public athlete record</span>
          <span>@{profile.user.handle}</span>
        </div>
        <div className="mt-6">
        <UsageDashboard
          actions={copy.common.buttons}
          avatarUrl={profile.user.avatarUrl}
          copy={copy.dashboard.usage}
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
