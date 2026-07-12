import Link from "next/link";

import { TokenRankLogo } from "@/components/brand/tokenrank-logo";
import type { Locale } from "@/src/i18n/config";
import { getCopy } from "@/src/i18n/copy";

export function Footer({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const privacyLine =
    locale === "zh"
      ? "只上传聚合数据 // prompt 与代码永不离开本机"
      : "AGGREGATES ONLY // PROMPTS AND CODE STAY LOCAL";

  return (
    <footer className="mt-auto border-t border-[color:var(--tr-line)] bg-[#080a08]">
      <div className="tr-container grid gap-6 py-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <TokenRankLogo />
          <p className="mt-5 max-w-2xl font-mono text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[color:var(--tr-muted)]">
            {privacyLine}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[color:var(--tr-muted)]">
          <Link href="/" className="hover:text-[color:var(--tr-gold)]">
            {copy.common.nav.leaderboard}
          </Link>
          <Link href="/rules" className="hover:text-[color:var(--tr-gold)]">
            {copy.common.nav.rules}
          </Link>
          <Link href="/onboard" className="hover:text-[color:var(--tr-gold)]">
            {copy.common.nav.start}
          </Link>
          <span className="text-[color:var(--tr-line-strong)]">TR / 2026</span>
        </div>
      </div>
    </footer>
  );
}
