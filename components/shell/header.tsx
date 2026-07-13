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
    <header className="sticky top-0 z-40 border-b border-[color:var(--tr-line)] bg-[#070907]/92 backdrop-blur-xl">
      <div className="tr-container">
        <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 py-3 sm:flex-nowrap">
          <Link href="/" className="group min-w-0 shrink-0">
            <TokenRankLogo />
          </Link>

          <nav className="order-3 flex w-full min-w-0 items-center gap-px overflow-x-auto border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] tr-scrollbar sm:order-none sm:ml-auto sm:w-auto">
            <NavLink href="/" label={copy.common.nav.leaderboard} />
            <NavLink href="/rules" label={copy.common.nav.rules} />
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 bg-[color:var(--tr-surface)] px-2 pr-3 font-mono text-xs font-bold uppercase text-[color:var(--tr-ivory-soft)] hover:bg-[color:var(--tr-gold)] hover:text-[#080705] sm:flex-none"
                aria-label={text(copy.common.nav.openDashboard, { name: user.name })}
              >
                <Avatar name={user.name} src={user.avatarUrl} />
                <span className="hidden max-w-28 truncate sm:inline">@{user.handle}</span>
              </Link>
            ) : (
              <NavLink href="/dashboard" label={copy.common.nav.dashboard} />
            )}
            <Link href="/onboard" className="tr-button h-10 min-h-10 flex-1 border-0 px-4 py-1 shadow-none hover:shadow-none sm:flex-none">
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
      className="h-10 flex-1 bg-[color:var(--tr-surface)] px-3.5 py-3 text-center font-mono text-xs font-bold uppercase tracking-[0.03em] text-[color:var(--tr-muted)] hover:bg-[color:var(--tr-surface-3)] hover:text-[color:var(--tr-gold)] sm:flex-none"
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
  return <ProfileAvatar className="size-7" fallbackTextClassName="font-mono text-xs" name={name} src={src} />;
}
