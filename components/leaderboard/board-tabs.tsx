import Link from "next/link";

import { defaultLocale, type Locale } from "@/src/i18n/config";
import { getCopy } from "@/src/i18n/copy";
import { BOARD_KEYS, type BoardKey, type RangeKey } from "@/src/lib/types";

export function boardLabel(board: BoardKey, locale: Locale = defaultLocale): string {
  return getCopy(locale).boards[board];
}

export function BoardTabs({
  active,
  locale = defaultLocale,
  range,
}: {
  active: BoardKey;
  locale?: Locale;
  range: RangeKey;
}) {
  return (
    <div className="flex w-full max-w-full min-w-0 items-center gap-1 overflow-x-auto pb-2 tr-scrollbar">
      {BOARD_KEYS.map((board, index) => (
        <Link
          key={board}
          href={`/?board=${board}&range=${range}#leaderboard`}
          scroll={false}
          aria-current={active === board ? "page" : undefined}
          className={
            active === board
              ? "shrink-0 border border-[color:var(--tr-gold)] bg-[color:var(--tr-gold)] px-3 py-2 font-mono text-[0.7rem] font-black uppercase text-[#080b07]"
              : "shrink-0 border border-[color:var(--tr-line)] bg-[color:var(--tr-surface-2)] px-3 py-2 font-mono text-[0.7rem] font-bold uppercase text-[color:var(--tr-muted)] hover:border-[color:var(--tr-line-strong)] hover:text-[color:var(--tr-ivory)]"
          }
        >
          <span className="mr-2 text-[0.55rem] opacity-50">{String(index + 1).padStart(2, "0")}</span>
          {boardLabel(board, locale)}
        </Link>
      ))}
    </div>
  );
}
