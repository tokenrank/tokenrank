import type { Metadata } from "next";

import "@fontsource-variable/antonio";
import "@fontsource-variable/ibm-plex-sans";

import { Footer } from "@/components/shell/footer";
import { Header } from "@/components/shell/header";
import { defaultLocale, htmlLang } from "@/src/i18n/config";
import { getCopy } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";
import { siteDescription, siteName, siteUrl } from "@/src/lib/site";

import "./globals.css";

const defaultCopy = getCopy(defaultLocale);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TokenRank - AI token leaderboard",
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "TokenRank",
    "AI agents",
    "AI token usage",
    "AI leaderboard",
    "Codex",
    "Claude Code",
    "Gemini",
    "Qwen",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TokenRank - AI token leaderboard",
    description: siteDescription,
    url: "/",
    siteName,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TokenRank - AI token leaderboard",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: locale === "zh" ? copy.home.metaDescription : defaultCopy.home.metaDescription,
    inLanguage: htmlLang(locale),
  };

  return (
    <html lang={htmlLang(locale)} className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[color:var(--background)] text-[color:var(--tr-ivory)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Header locale={locale} />
        {children}
        <Footer locale={locale} />
      </body>
    </html>
  );
}
