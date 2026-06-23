import type { Metadata } from "next";

import { Header } from "@/components/shell/header";

import "./globals.css";

export const metadata: Metadata = {
  title: "TokenRank",
  description: "Public X leaderboard for AI coding token usage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-950">
        <Header />
        {children}
      </body>
    </html>
  );
}
