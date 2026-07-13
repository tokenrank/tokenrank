import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Gauge, ShieldCheck, Terminal, Trophy, UploadCloud } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { XSignInButton } from "@/components/auth/x-sign-in-button";
import { UploadCompletionRedirect } from "@/components/connect/upload-completion-redirect";
import { WebhookTokenPanel } from "@/components/connect/webhook-token-panel";
import { auth } from "@/src/auth/config";
import { getXSignInGuard } from "@/src/auth/sign-in-guard";
import { defaultLocale } from "@/src/i18n/config";
import { getCopy, text } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";
import { absoluteUrl, siteName } from "@/src/lib/site";
import { getUserUploadStatus } from "@/src/lib/users";

export const dynamic = "force-dynamic";
const metadataCopy = getCopy(defaultLocale).onboard;
const onboardUrl = absoluteUrl("/onboard");
export const metadata: Metadata = {
  title: metadataCopy.metaTitle,
  description: metadataCopy.metaDescription,
  alternates: {
    canonical: onboardUrl,
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: metadataCopy.metaTitle,
    description: metadataCopy.metaDescription,
    url: onboardUrl,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: metadataCopy.metaTitle,
    description: metadataCopy.metaDescription,
  },
};

export default async function OnboardPage() {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const session = await auth();
  const user = session?.user;
  const xSignInGuard = await getXSignInGuard("/onboard", locale);
  const upload = user?.id
    ? await getUserUploadStatus(user.id)
    : { hasUsage: false, latestUploadedAt: null };
  const initialLatestUploadedAt = upload.latestUploadedAt;

  return (
    <main className="tr-page w-full flex-1">
      <section className="tr-container py-8 sm:py-12 lg:py-16">
        <div className="tr-live-tape tr-reveal">
          <span>Join sequence / 04 stages</span>
          <span>{upload.hasUsage ? "Signal detected" : user ? "Identity confirmed" : "Awaiting identity"}</span>
        </div>

        <div className="relative overflow-hidden border-x border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] p-6 sm:p-9 lg:p-12">
          <span className="tr-page-number" aria-hidden="true">
            03
          </span>
          <div className="relative z-10 max-w-5xl">
            <p className="tr-kicker">{copy.onboard.hero.eyebrow}</p>
            <h1 className="tr-title mt-8 text-[clamp(4rem,9vw,8.5rem)]">{copy.onboard.hero.title}</h1>
            <p className="tr-body mt-7 max-w-3xl text-base sm:text-lg">{copy.onboard.hero.body}</p>
          </div>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-6">
            {user ? (
              <>
                <section className="tr-shell tr-reveal">
                  <div className="tr-panel p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center bg-[color:var(--tr-gold)] text-[#080b07]">
                          <CheckCircle2 className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="tr-data-label">Stage 01 / complete</p>
                          <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-[-0.025em] text-[color:var(--tr-ivory)]">
                            {text(copy.onboard.signedIn.title, { name: user.name ?? "X user" })}
                          </h2>
                          <p className="tr-body mt-2 text-sm">{copy.onboard.signedIn.body}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-3">
                        <Link href="/dashboard" className="tr-button h-10 min-h-10 px-4">
                          <Gauge className="size-4" aria-hidden="true" />
                          {copy.onboard.signedIn.dashboard}
                        </Link>
                        <SignOutButton copy={copy.common.buttons} />
                      </div>
                    </div>
                  </div>
                </section>

                <WebhookTokenPanel actions={copy.common.buttons} copy={copy.onboard.webhook} />
                <UploadCompletionRedirect
                  copy={copy.onboard.redirect}
                  initialLatestUploadedAt={initialLatestUploadedAt}
                />
              </>
            ) : (
              <section className="tr-shell tr-reveal lg:min-h-[38rem]">
                <div className="tr-panel relative grid gap-6 overflow-hidden p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8 lg:min-h-[38rem]">
                  <span className="pointer-events-none absolute right-8 top-8 hidden font-display text-[12rem] font-bold leading-none text-[color:var(--tr-line)] opacity-45 lg:block" aria-hidden="true">
                    01
                  </span>
                  <div className="relative z-10">
                    <p className="tr-data-label">Stage 01 / identity</p>
                    <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">
                      {copy.onboard.signIn.title}
                    </h2>
                    <p className="tr-body mt-3 max-w-2xl text-sm">{copy.onboard.signIn.body}</p>
                  </div>
                  <div className="relative z-10">
                    <XSignInButton
                      alternateHref={xSignInGuard.alternateHref}
                      alternateLabel={xSignInGuard.alternateLabel}
                      callbackUrl="/onboard"
                      copy={copy.auth.button}
                      disabledReason={xSignInGuard.disabledReason}
                      variant="inverted"
                    />
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="tr-shell tr-reveal self-start">
            <div className="tr-panel p-5">
              <div className="flex items-center justify-between border-b border-[color:var(--tr-line)] pb-4">
                <div>
                  <p className="tr-data-label">Progress rail</p>
                  <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">
                    {copy.onboard.flowTitle}
                  </h2>
                </div>
                <span className="font-display text-4xl font-bold text-[color:var(--tr-line-strong)]">04</span>
              </div>
              <div className="mt-5">
                <Step done={Boolean(user)} index="01" icon={<ShieldCheck className="size-4" aria-hidden="true" />} title={copy.onboard.steps[0].title} text={copy.onboard.steps[0].body} />
                <Step done={Boolean(user)} index="02" icon={<Terminal className="size-4" aria-hidden="true" />} title={copy.onboard.steps[1].title} text={copy.onboard.steps[1].body} />
                <Step done={upload.hasUsage} index="03" icon={<UploadCloud className="size-4" aria-hidden="true" />} title={copy.onboard.steps[2].title} text={copy.onboard.steps[2].body} />
                <Step done={upload.hasUsage} index="04" icon={<Trophy className="size-4" aria-hidden="true" />} title={copy.onboard.steps[3].title} text={copy.onboard.steps[3].body} last />
              </div>
              <div className="mt-5 border-l-4 border-[color:var(--tr-orange)] bg-[color:var(--tr-orange-soft)]/25 p-4 font-mono text-xs leading-6 text-[color:var(--tr-ivory-soft)]">
                {copy.onboard.asideNote}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Step({
  done,
  icon,
  index,
  last = false,
  title,
  text,
}: {
  done: boolean;
  icon: React.ReactNode;
  index: string;
  last?: boolean;
  title: string;
  text: string;
}) {
  return (
    <div className="relative grid grid-cols-[2.75rem_1fr] gap-3 pb-6 last:pb-0">
      {last ? null : <span className="absolute bottom-0 left-[1.34rem] top-10 w-px bg-[color:var(--tr-line)]" />}
      <span
        className={`relative z-10 flex size-11 items-center justify-center font-mono text-xs font-black ${
          done
            ? "bg-[color:var(--tr-gold)] text-[#080b07]"
            : "border border-[color:var(--tr-line)] bg-[color:var(--tr-surface-2)] text-[color:var(--tr-muted)]"
        }`}
      >
        {done ? <CheckCircle2 className="size-4" aria-hidden="true" /> : icon}
      </span>
      <span className="pt-0.5">
        <span className="tr-data-label">Stage {index}</span>
        <span className="mt-1 block text-sm font-black text-[color:var(--tr-ivory)]">{title}</span>
        <span className="mt-1 block text-xs leading-6 text-[color:var(--tr-muted)]">{text}</span>
      </span>
    </div>
  );
}
