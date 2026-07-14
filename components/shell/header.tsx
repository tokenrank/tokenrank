import Link from "next/link";

import { ProfileAvatar } from "@/components/brand/profile-avatar";
import { TokenRankLogo } from "@/components/brand/tokenrank-logo";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import { auth } from "@/src/auth/config";
import type { Locale } from "@/src/i18n/config";
import { getCopy, text } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";
import { getUserSettings } from "@/src/lib/users";

export async function Header({ locale: providedLocale }: { locale?: Locale } = {}) {
  const locale = providedLocale ?? (await getRequestLocale());
  const copy = getCopy(locale);
  const user = await getHeaderUser();

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--tr-line)] bg-[#070907] sm:bg-[#070907]/92 sm:backdrop-blur-xl">
      <div className="tr-container">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2 sm:min-h-20 sm:py-3">
          <Link href="/" className="group min-w-0 shrink-0">
            <TokenRankLogo />
          </Link>

          <nav
            aria-label={locale === "zh" ? "主导航" : "Primary navigation"}
            className="tr-mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 gap-px border-t border-[color:var(--tr-line)] bg-[color:var(--tr-line)] shadow-[0_-12px_32px_rgb(0_0_0/0.42)] sm:static sm:z-auto sm:ml-auto sm:flex sm:w-auto sm:items-center sm:border sm:shadow-none"
          >
            <NavLink href="/#leaderboard" label={copy.common.nav.leaderboard} />
            <NavLink href="/rules" label={copy.common.nav.rules} />
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-14 min-w-0 items-center justify-center gap-1.5 bg-[color:var(--tr-surface)] px-1 font-mono text-[0.65rem] font-bold uppercase leading-tight text-[color:var(--tr-ivory-soft)] hover:bg-[color:var(--tr-gold)] hover:text-[#080705] sm:h-10 sm:flex-none sm:gap-2 sm:px-2 sm:pr-3 sm:text-xs"
                aria-label={text(copy.common.nav.openDashboard, { name: user.name })}
              >
                <Avatar name={user.name} src={user.avatarUrl} />
                <span className="min-w-0 truncate sm:hidden">{copy.common.nav.dashboard}</span>
                <span className="hidden max-w-28 truncate sm:inline">@{user.handle}</span>
              </Link>
            ) : (
              <NavLink href="/dashboard" label={copy.common.nav.dashboard} />
            )}
            <Link
              href="/onboard"
              className="tr-button h-14 min-h-14 min-w-0 border-0 px-1 py-2 text-center text-[0.65rem] leading-tight shadow-none hover:shadow-none sm:h-10 sm:min-h-10 sm:flex-none sm:px-4 sm:py-1 sm:text-xs"
            >
              {copy.common.nav.start}
            </Link>
          </nav>

          <LanguageSwitch copy={copy.common.language} locale={locale} />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-14 min-w-0 items-center justify-center bg-[color:var(--tr-surface)] px-1 py-2 text-center font-mono text-[0.65rem] font-bold uppercase leading-tight tracking-[0.03em] text-[color:var(--tr-muted)] hover:bg-[color:var(--tr-surface-3)] hover:text-[color:var(--tr-gold)] sm:h-10 sm:flex-none sm:px-3.5 sm:py-3 sm:text-xs"
    >
      {label}
    </Link>
  );
}

async function getHeaderUser() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    const session = await auth();
    return session?.user?.id ? await getUserSettings(session.user.id) : null;
  } catch {
    return null;
  }
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  return <ProfileAvatar className="size-6 sm:size-7" fallbackTextClassName="font-mono text-xs" name={name} src={src} />;
}
