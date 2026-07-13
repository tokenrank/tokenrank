import type { Metadata } from "next";

import "@fontsource-variable/antonio";
import "@fontsource-variable/ibm-plex-sans";

import { Footer } from "@/components/shell/footer";
import { Header } from "@/components/shell/header";
import { defaultLocale, htmlLang } from "@/src/i18n/config";
import { getCopy } from "@/src/i18n/copy";
import { getRequestLocale } from "@/src/i18n/server";
import { absoluteUrl, siteDescription, siteName, siteUrl } from "@/src/lib/site";

import "./globals.css";

const defaultCopy = getCopy(defaultLocale);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultCopy.home.metaTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: defaultCopy.home.metaTitle,
    description: siteDescription,
    url: absoluteUrl("/"),
    siteName,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultCopy.home.metaTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={htmlLang(locale)} className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[color:var(--background)] text-[color:var(--tr-ivory)]">
        <Header locale={locale} />
        {children}
        <Footer locale={locale} />
      </body>
    </html>
  );
}
