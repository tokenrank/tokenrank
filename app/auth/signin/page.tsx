import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, Trophy, UploadCloud } from "lucide-react";

import { XSignInButton } from "@/components/auth/x-sign-in-button";
import { auth } from "@/src/auth/config";
import { getXSignInErrorMessage, getXSignInGuard } from "@/src/auth/sign-in-guard";
import { defaultLocale } from "@/src/i18n/config";
import { getCopy } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";

export const dynamic = "force-dynamic";
const metadataCopy = getCopy(defaultLocale).auth;
export const metadata: Metadata = {
  title: metadataCopy.metaTitle,
  description: metadataCopy.metaDescription,
  robots: {
    index: false,
    follow: false,
  },
};

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const session = await auth();
  const xSignInGuard = await getXSignInGuard(callbackUrl, locale);
  const xSignInErrorMessage = getXSignInErrorMessage(params.error, locale);

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <main className="tr-page w-full flex-1">
      <section className="tr-container py-8 sm:py-12 lg:py-16">
        <div className="tr-live-tape tr-reveal">
          <span>Identity relay / X OAuth</span>
          <span>Status / awaiting signal</span>
        </div>

        <div className="grid border-x border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] lg:grid-cols-[minmax(0,1.25fr)_minmax(21rem,0.75fr)]">
          <div className="relative overflow-hidden border-b border-[color:var(--tr-line)] p-6 sm:p-9 lg:border-b-0 lg:border-r lg:p-12">
            <span className="tr-page-number" aria-hidden="true">
              04
            </span>
            <div className="relative z-10">
              <p className="tr-kicker">{copy.auth.hero.eyebrow}</p>
              <h1 className="tr-title mt-8 max-w-4xl text-[clamp(4rem,8vw,7.5rem)]">
                {copy.auth.hero.title}
              </h1>
              <p className="tr-body mt-7 max-w-2xl text-base sm:text-lg">{copy.auth.hero.body}</p>

              <div className="mt-12 border-t border-[color:var(--tr-line)] pt-6">
                <p className="tr-data-label">{copy.auth.nextTitle}</p>
                <div className="mt-5 grid gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] sm:grid-cols-3">
                  <Step index="01" icon={<ShieldCheck className="size-4" aria-hidden="true" />} title={copy.auth.steps[0].title} text={copy.auth.steps[0].body} />
                  <Step index="02" icon={<UploadCloud className="size-4" aria-hidden="true" />} title={copy.auth.steps[1].title} text={copy.auth.steps[1].body} />
                  <Step index="03" icon={<Trophy className="size-4" aria-hidden="true" />} title={copy.auth.steps[2].title} text={copy.auth.steps[2].body} />
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col justify-center p-5 sm:p-8">
            <div className="border border-[color:var(--tr-line-strong)] bg-[#090c09] p-5 sm:p-7">
              <div className="flex items-center justify-between border-b border-[color:var(--tr-line)] pb-4">
                <div>
                  <p className="tr-data-label">Access badge</p>
                  <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">
                    {copy.auth.security.title}
                  </h2>
                </div>
                <ShieldCheck className="size-7 shrink-0 text-[color:var(--tr-gold)]" aria-hidden="true" />
              </div>
              <p className="mt-5 text-sm leading-7 text-[color:var(--tr-muted)]">{copy.auth.security.body}</p>

              {xSignInGuard.disabledReason ? (
                <div className="mt-5 border border-[color:var(--tr-orange)] bg-[color:var(--tr-orange-soft)]/40 p-4 font-mono text-xs font-bold leading-6 text-[color:var(--tr-orange)]">
                  {xSignInGuard.disabledReason}
                </div>
              ) : xSignInErrorMessage ? (
                <div className="mt-5 border border-[color:var(--tr-red)] bg-red-950/35 p-4 font-mono text-xs font-bold leading-6 text-[color:var(--tr-red)]">
                  {xSignInErrorMessage}
                </div>
              ) : null}

              <div className="mt-7">
                <XSignInButton
                  alternateHref={xSignInGuard.alternateHref}
                  alternateLabel={xSignInGuard.alternateLabel}
                  callbackUrl={callbackUrl}
                  copy={copy.auth.button}
                  disabledReason={xSignInGuard.disabledReason}
                  showDisabledReason={false}
                />
              </div>

              <Link href="/onboard" className="tr-button-secondary mt-4 w-full">
                {copy.auth.back}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Step({
  icon,
  index,
  title,
  text,
}: {
  icon: React.ReactNode;
  index: string;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-[color:var(--tr-surface)] p-4">
      <div className="flex items-center justify-between text-[color:var(--tr-gold)]">
        <span className="font-display text-2xl font-bold">{index}</span>
        {icon}
      </div>
      <h3 className="mt-5 text-sm font-black text-[color:var(--tr-ivory)]">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-[color:var(--tr-muted)]">{text}</p>
    </div>
  );
}

function safeCallbackUrl(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboard";
  }

  return value;
}
