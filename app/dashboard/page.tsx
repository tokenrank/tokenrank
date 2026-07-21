import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Database, RefreshCw } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { XSignInButton } from "@/components/auth/x-sign-in-button";
import { PrivacySettingsPanel } from "@/components/dashboard/privacy-settings-panel";
import { UsageDashboard } from "@/components/dashboard/usage-dashboard";
import { auth } from "@/src/auth/config";
import { getXSignInGuard } from "@/src/auth/sign-in-guard";
import { defaultLocale } from "@/src/i18n/config";
import { getCopy } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";
import { getUserDashboard } from "@/src/lib/users";

export const dynamic = "force-dynamic";
const metadataCopy = getCopy(defaultLocale).dashboard;
export const metadata: Metadata = {
  title: metadataCopy.metaTitle,
  description: metadataCopy.metaDescription,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const session = await auth();
  const user = session?.user;
  const xSignInGuard = await getXSignInGuard("/dashboard", locale);

  if (!user?.id) {
    return (
      <main className="tr-page w-full flex-1">
        <section className="tr-container py-8 sm:py-12 lg:py-16">
          <div className="tr-live-tape tr-reveal">
            <span>Private record / locked</span>
            <span>Auth required</span>
          </div>
          <div
            className="relative overflow-hidden border-x border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)]"
            data-testid="signed-out-dashboard-card"
          >
            <span className="tr-page-number" aria-hidden="true">
              05
            </span>
            <div className="relative z-10 grid gap-8 p-6 sm:p-10 lg:p-12 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-end">
              <div className="min-w-0">
                <p className="tr-kicker">{copy.dashboard.signedOut.eyebrow}</p>
                <h1 className="tr-title mt-7 max-w-5xl text-[clamp(3.5rem,7vw,7rem)]">
                  {copy.dashboard.signedOut.title}
                </h1>
                <p className="tr-body mt-7 max-w-2xl text-base sm:text-lg">
                  {copy.dashboard.signedOut.body}
                </p>
              </div>

              <div
                className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1 xl:border-l xl:border-[color:var(--tr-line)] xl:pl-6 [&_a]:w-full [&_button]:w-full"
                data-testid="signed-out-dashboard-actions"
              >
                <XSignInButton
                  alternateHref={xSignInGuard.alternateHref}
                  alternateLabel={xSignInGuard.alternateLabel}
                  callbackUrl="/dashboard"
                  copy={copy.auth.button}
                  disabledReason={xSignInGuard.disabledReason}
                  showDisabledReason={false}
                  variant="solid"
                />
                <Link href="/onboard" className="tr-button-secondary">
                  {copy.dashboard.signedOut.onboard}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
            {xSignInGuard.disabledReason ? (
              <div
                className="relative z-10 grid gap-2 border-t border-[color:var(--tr-line)] bg-[color:var(--tr-surface-2)]/75 px-6 py-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-5 sm:px-10 lg:px-12"
                role="status"
              >
                <p className="tr-data-label whitespace-nowrap text-[color:var(--tr-gold)]">
                  {copy.onboard.signIn.statusLabel}
                </p>
                <p className="max-w-3xl text-sm leading-6 text-[color:var(--tr-muted)]">
                  {xSignInGuard.disabledReason}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  const dashboard = await getUserDashboard(user.id);

  if (!dashboard) {
    return (
      <main className="tr-page w-full flex-1">
        <section className="tr-container py-12 lg:py-20">
          <div className="tr-shell tr-reveal mx-auto max-w-4xl">
            <div className="tr-panel p-8 sm:p-12">
              <p className="tr-data-label">Error / record unavailable</p>
              <h1 className="tr-title mt-5 text-5xl sm:text-7xl">{copy.dashboard.missing.title}</h1>
              <p className="tr-body mt-5 text-base">{copy.dashboard.missing.body}</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="tr-page w-full flex-1">
      <section className="tr-container py-8 sm:py-12 lg:py-16">
        <div className="tr-live-tape tr-reveal">
          <span>Private record / active</span>
          <span>@{dashboard.user.handle}</span>
        </div>
        <div className="relative mb-7 overflow-hidden border-x border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] p-6 sm:p-8 lg:p-10">
          <span className="tr-page-number" aria-hidden="true">
            05
          </span>
          <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
            <div>
              <p className="tr-kicker">{copy.dashboard.hero.eyebrow}</p>
              <h1 className="tr-title mt-7 text-[clamp(3.8rem,8vw,7.5rem)]">{copy.dashboard.hero.title}</h1>
              <p className="tr-body mt-6 max-w-3xl text-base">{copy.dashboard.hero.body}</p>
            </div>
            <div className="grid gap-3 border-l border-[color:var(--tr-line)] pl-5">
              <Link href="/onboard" className="tr-button h-10 min-h-10 px-4">
                <RefreshCw className="size-4" aria-hidden="true" />
                {copy.common.buttons.refreshCommand}
              </Link>
              <Link href={`/u/${dashboard.user.handle}`} className="tr-button-secondary h-10 min-h-10 px-4">
                <Database className="size-4" aria-hidden="true" />
                {copy.common.buttons.viewPublic}
              </Link>
              <SignOutButton copy={copy.common.buttons} />
            </div>
          </div>
        </div>

        {dashboard.daily.length ? (
          <UsageDashboard
            actions={copy.common.buttons}
            avatarUrl={dashboard.user.avatarUrl}
            copy={copy.dashboard.usage}
            daily={dashboard.daily}
            handle={dashboard.user.handle}
            locale={locale}
            name={dashboard.user.name}
          />
        ) : (
          <section className="tr-shell tr-reveal">
            <div className="tr-panel grid min-h-[22rem] place-items-center p-8 text-center">
              <div>
                <p className="font-display text-8xl font-bold leading-none text-[color:var(--tr-line)]">000</p>
                <h2 className="tr-title -mt-3 text-4xl">{copy.dashboard.empty.title}</h2>
                <p className="tr-body mx-auto mt-5 max-w-2xl text-sm">{copy.dashboard.empty.body}</p>
                <Link href="/onboard" className="tr-button mt-7">
                  {copy.dashboard.empty.cta}
                </Link>
              </div>
            </div>
          </section>
        )}

        <div className="mt-7">
          <PrivacySettingsPanel copy={copy.dashboard.privacy} initialSettings={dashboard.user} />
        </div>
      </section>
    </main>
  );
}
