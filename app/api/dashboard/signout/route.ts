import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sessions } from "@/src/db/schema";

const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
] as const;

const AUTH_COOKIE_NAMES = [
  ...SESSION_COOKIE_NAMES,
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
] as const;

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = SESSION_COOKIE_NAMES
    .map((name) => cookieStore.get(name)?.value)
    .find((value): value is string => Boolean(value));

  if (process.env.DATABASE_URL && sessionToken) {
    try {
      const { db } = await import("@/src/db/client");
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    } catch {
      // Cookie clearing still completes even if the backing session row is already gone.
    }
  }

  const response = NextResponse.json({ status: 0 });

  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  }

  return response;
}
