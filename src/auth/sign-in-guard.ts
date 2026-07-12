import { headers } from "next/headers";

import { defaultLocale, type Locale } from "@/src/i18n/config";
import { getCopy, text } from "@/src/i18n/copy";

type XSignInGuard = {
  alternateHref?: string;
  alternateLabel?: string;
  disabledReason?: string;
};

export async function getXSignInGuard(
  callbackUrl: string,
  locale: Locale = defaultLocale,
): Promise<XSignInGuard> {
  const authCopy = getCopy(locale).auth;

  if (!process.env.DATABASE_URL) {
    return {
      disabledReason: authCopy.guard.missingDatabase,
    };
  }

  if (!process.env.AUTH_X_ID || !process.env.AUTH_X_SECRET) {
    return {
      disabledReason: authCopy.guard.missingX,
    };
  }

  const canonicalOrigin = getCanonicalOrigin();
  const canonicalHost = new URL(canonicalOrigin).host.toLowerCase();
  const requestHeaders = await headers();
  const currentHost = (
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    ""
  ).toLowerCase();

  if (currentHost && currentHost !== canonicalHost) {
    return {
      alternateHref: new URL(
        `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        canonicalOrigin,
      ).toString(),
      alternateLabel: authCopy.button.canonical,
      disabledReason: text(authCopy.guard.hostMismatch, { currentHost, canonicalHost }),
    };
  }

  return {};
}

export function getXSignInErrorMessage(
  error: string | undefined,
  locale: Locale = defaultLocale,
): string | undefined {
  if (!error) {
    return undefined;
  }

  const errors = getCopy(locale).auth.errors;

  if (error === "OAuthCallback") {
    return errors.oauth;
  }

  if (error === "Callback") {
    return errors.callback;
  }

  return errors.fallback;
}

function getCanonicalOrigin(): string {
  return (process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010").replace(
    /\/$/,
    "",
  );
}
