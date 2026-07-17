import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { defaultLocale } from "@/src/i18n/config";
import { getCopy } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";
import { absoluteUrl } from "@/src/lib/site";
import { createSocialMetadata } from "@/src/lib/social-metadata";

const metadataCopy = getCopy(defaultLocale).rules;
const rulesUrl = absoluteUrl("/rules");
export const metadata: Metadata = {
  title: metadataCopy.metaTitle,
  description: metadataCopy.metaDescription,
  alternates: {
    canonical: rulesUrl,
  },
  ...createSocialMetadata({
    title: metadataCopy.metaTitle,
    description: metadataCopy.metaDescription,
    url: rulesUrl,
  }),
};

export default async function RulesPage() {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
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
        name: copy.rules.metaTitle,
        item: rulesUrl,
      },
    ],
  };

  return (
    <main className="tr-page w-full flex-1">
      <JsonLd data={breadcrumbJsonLd} />
      <section className="tr-container py-8 sm:py-12 lg:py-16">
        <nav aria-label={locale === "zh" ? "面包屑" : "Breadcrumb"} className="mb-5 font-mono text-xs font-bold uppercase text-[color:var(--tr-muted)]">
          <Link href="/" className="hover:text-[color:var(--tr-gold)]">
            {locale === "zh" ? "榜单" : "Leaderboard"}
          </Link>
          <span className="px-2 text-[color:var(--tr-line-strong)]" aria-hidden="true">/</span>
          <span aria-current="page">{locale === "zh" ? "规则" : "Rules"}</span>
        </nav>
        <div className="tr-live-tape tr-reveal">
          <span>Protocol / public trust</span>
          <span>Revision / 07</span>
        </div>

        <div className="grid border-x border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]">
          <div className="relative min-h-[31rem] overflow-hidden border-b border-[color:var(--tr-line)] p-6 sm:p-9 lg:border-b-0 lg:border-r lg:p-12">
            <span className="tr-page-number" aria-hidden="true">
              02
            </span>
            <div className="relative z-10 flex h-full max-w-4xl flex-col justify-between">
              <div>
                <p className="tr-kicker">{copy.rules.hero.eyebrow}</p>
                <h1 className="tr-title mt-8 text-[clamp(4rem,9vw,8rem)]">
                  {copy.rules.hero.title}
                </h1>
                <p className="tr-body mt-7 max-w-2xl text-base sm:text-lg">
                  {copy.rules.hero.body}
                </p>
              </div>
              <Link href="/onboard" className="tr-button mt-10 w-fit">
                {copy.rules.hero.cta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className="flex flex-col justify-between bg-[color:var(--tr-orange)] p-6 text-[#090b08] sm:p-8">
            <div className="flex items-center justify-between border-b border-black/30 pb-4">
              <span className="font-mono text-[0.65rem] font-black uppercase tracking-[0.14em]">
                Boundary / 01
              </span>
              <ShieldCheck className="size-7" aria-hidden="true" />
            </div>
            <div className="py-12">
              <div className="font-display text-[7rem] font-bold leading-none opacity-20" aria-hidden="true">
                SAFE
              </div>
              <h2 className="-mt-4 font-display text-4xl font-bold uppercase tracking-[-0.04em]">
                {copy.rules.privacy.title}
              </h2>
              <p className="mt-5 text-sm font-semibold leading-7">{copy.rules.privacy.body}</p>
            </div>
            <div className="border-t border-black/30 pt-4 font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em]">
              Prompts: 0 // Source files: 0 // Chats: 0
            </div>
          </aside>
        </div>

        <div className="mt-14 flex items-end justify-between gap-6 border-b border-[color:var(--tr-line-strong)] pb-5">
          <div>
            <p className="tr-data-label">Operating protocol</p>
            <h2 className="mt-2 font-display text-4xl font-bold uppercase tracking-[-0.035em] sm:text-5xl">
              07 / Ground rules
            </h2>
          </div>
          <CheckCircle2 className="hidden size-8 text-[color:var(--tr-gold)] sm:block" aria-hidden="true" />
        </div>

        <section className="border-x border-[color:var(--tr-line)]">
          {copy.rules.cards.map((card, index) => (
            <RuleRow
              key={card.title}
              index={String(index + 1).padStart(2, "0")}
              title={card.title}
            >
              {card.body}
            </RuleRow>
          ))}
        </section>
      </section>
    </main>
  );
}

function RuleRow({
  children,
  index,
  title,
}: {
  children: React.ReactNode;
  index: string;
  title: string;
}) {
  return (
    <article className="tr-reveal grid gap-4 border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] p-5 transition-colors hover:bg-[color:var(--tr-surface-3)] sm:grid-cols-[7rem_minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-start sm:gap-7 sm:p-7">
      <div className="tr-rule-index">{index}</div>
      <h3 className="font-display text-2xl font-bold uppercase leading-tight tracking-[-0.025em] text-[color:var(--tr-ivory)]">
        {title}
      </h3>
      <p className="text-sm leading-7 text-[color:var(--tr-muted)]">{children}</p>
    </article>
  );
}
