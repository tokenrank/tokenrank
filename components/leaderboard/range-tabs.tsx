import Link from "next/link";

import { defaultLocale, type Locale } from "@/src/i18n/config";
import { getCopy } from "@/src/i18n/copy";
import type { BoardKey, RangeKey } from "@/src/lib/types";

const RANGE_KEYS: RangeKey[] = ["today", "3d", "7d", "30d", "month"];

export function rangeLabel(range: RangeKey, locale: Locale = defaultLocale): string {
  return getCopy(locale).ranges[range] ?? range;
}

export function RangeTabs({
  active,
  board,
  locale = defaultLocale,
}: {
  active: RangeKey;
  board: BoardKey;
  locale?: Locale;
}) {
  return (
    <div className="inline-flex w-full shrink-0 gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] sm:w-auto">
      {RANGE_KEYS.map((range) => (
        <Link
          key={range}
          href={`/?board=${board}&range=${range}#leaderboard`}
          scroll={false}
          aria-current={active === range ? "page" : undefined}
          className={
            active === range
              ? "flex-1 bg-[color:var(--tr-orange)] px-3 py-2 text-center font-mono text-[0.7rem] font-black uppercase text-[#080705] sm:flex-none"
              : "flex-1 bg-[color:var(--tr-surface-2)] px-3 py-2 text-center font-mono text-[0.7rem] font-bold uppercase text-[color:var(--tr-muted)] hover:bg-[color:var(--tr-surface-3)] hover:text-[color:var(--tr-ivory)] sm:flex-none"
          }
        >
          {rangeLabel(range, locale)}
        </Link>
      ))}
    </div>
  );
}
