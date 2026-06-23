import { eq } from "drizzle-orm";
import NextAuth, { type NextAuthOptions } from "next-auth";
import type { Account, Profile, User } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { getServerSession } from "next-auth/next";
import Twitter, { type TwitterProfile } from "next-auth/providers/twitter";

import { accounts, sessions, users, verificationTokens } from "../db/schema";

type XIdentityInput = {
  account: Pick<Account, "provider" | "providerAccountId"> | null;
  profile?: unknown;
  user?: Pick<User, "name" | "image"> | null;
};

type XIdentityUpdate = {
  xId: string;
  xHandle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  updatedAt: Date;
};

type TwitterV2Data = Partial<TwitterProfile["data"]>;

const adapterMethodNames = [
  "createUser",
  "getUser",
  "getUserByEmail",
  "getUserByAccount",
  "updateUser",
  "linkAccount",
  "createSession",
  "getSessionAndUser",
  "updateSession",
  "deleteSession",
  "createVerificationToken",
  "useVerificationToken",
] as const satisfies readonly (keyof Adapter)[];

let authAdapterPromise: Promise<Adapter> | null = null;

async function getAuthAdapter(): Promise<Adapter> {
  authAdapterPromise ??= (async () => {
    const [{ DrizzleAdapter }, { db }] = await Promise.all([
      import("@auth/drizzle-adapter") as Promise<{
        DrizzleAdapter: (db: unknown, schema: unknown) => unknown;
      }>,
      import("../db/client"),
    ]);

    // @auth/drizzle-adapter publishes Auth.js core adapter types while this
    // app is pinned to next-auth v4; keep the compatibility cast here.
    return DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }) as Adapter;
  })();

  return authAdapterPromise;
}

function lazyAdapterMethod<K extends (typeof adapterMethodNames)[number]>(
  methodName: K,
): NonNullable<Adapter[K]> {
  return (async (...args: unknown[]) => {
    const adapter = await getAuthAdapter();
    const method = adapter[methodName];

    if (typeof method !== "function") {
      throw new Error(`Auth adapter method ${String(methodName)} is unavailable`);
    }

    return (method as (...args: unknown[]) => unknown)(...args);
  }) as NonNullable<Adapter[K]>;
}

const adapter = Object.fromEntries(
  adapterMethodNames.map((methodName) => [methodName, lazyAdapterMethod(methodName)]),
) as Adapter;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTwitterV2Data(profile: unknown): TwitterV2Data | null {
  if (!isRecord(profile) || !isRecord(profile.data)) {
    return null;
  }

  return profile.data as TwitterV2Data;
}

function firstString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function normalizeXHandle(handle: string | null): string | null {
  const normalized = handle?.replace(/^@+/, "").trim().toLowerCase();
  return normalized || null;
}

export function getXIdentityUpdate({
  account,
  profile,
  user,
}: XIdentityInput): XIdentityUpdate | null {
  if (account?.provider !== "twitter" || !account.providerAccountId) {
    return null;
  }

  const data = getTwitterV2Data(profile);
  const xHandle = normalizeXHandle(
    typeof data?.username === "string" ? data.username : null,
  );

  return {
    xId: account.providerAccountId,
    xHandle,
    displayName: firstString(
      typeof data?.name === "string" ? data.name : null,
      user?.name,
    ),
    avatarUrl: firstString(
      typeof data?.profile_image_url === "string" ? data.profile_image_url : null,
      user?.image,
    ),
    updatedAt: new Date(),
  };
}

async function syncXIdentity({
  userId,
  account,
  profile,
  user,
}: XIdentityInput & { userId: string }) {
  const update = getXIdentityUpdate({ account, profile, user });

  if (!update) {
    return;
  }

  const { db } = await import("../db/client");

  await db.update(users).set(update).where(eq(users.id, userId));
}

export const authOptions = {
  adapter,
  providers: [
    Twitter({
      clientId: process.env.AUTH_X_ID ?? "",
      clientSecret: process.env.AUTH_X_SECRET ?? "",
      version: "2.0",
    }),
  ],
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "database",
  },
  callbacks: {
    async signIn() {
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (!user.id) {
        return;
      }

      await syncXIdentity({
        userId: user.id,
        account,
        profile: profile as Profile | undefined,
        user,
      });
    },
  },
} satisfies NextAuthOptions;

export function auth() {
  return getServerSession(authOptions);
}

export const authHandler = NextAuth(authOptions);
