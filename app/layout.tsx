import type { Metadata, Viewport } from "next";

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
  manifest: "/manifest.webmanifest",
  category: "technology",
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteName,
  },
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
  other: {
    "msapplication-TileColor": "#070907",
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

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070907",
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
