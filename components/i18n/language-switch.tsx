"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { localeCookieName, type Locale } from "@/src/i18n/config";

export function LanguageSwitch({
  copy,
  locale,
}: {
  copy: {
    label: string;
    english: string;
    chinese: string;
  };
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(nextLocale: Locale) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLocale === "zh" ? "zh-CN" : "en-US";
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      aria-label={copy.label}
      className="inline-flex h-10 shrink-0 items-center border border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] p-1"
      role="group"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        disabled={pending}
        aria-pressed={locale === "en"}
        className={
          locale === "en"
            ? "h-7 bg-[color:var(--tr-gold)] px-3 font-mono text-[0.65rem] font-black text-[#080705]"
            : "h-7 px-3 font-mono text-[0.65rem] font-bold text-[color:var(--tr-muted)] hover:text-[color:var(--tr-ivory)]"
        }
      >
        {copy.english}
      </button>
      <button
        type="button"
        onClick={() => setLocale("zh")}
        disabled={pending}
        aria-pressed={locale === "zh"}
        className={
          locale === "zh"
            ? "h-7 bg-[color:var(--tr-gold)] px-3 font-mono text-[0.65rem] font-black text-[#080705]"
            : "h-7 px-3 font-mono text-[0.65rem] font-bold text-[color:var(--tr-muted)] hover:text-[color:var(--tr-ivory)]"
        }
      >
        {copy.chinese}
      </button>
    </div>
  );
}
