import { eq } from "drizzle-orm";
import { HttpsProxyAgent } from "https-proxy-agent";
import NextAuth, { type NextAuthOptions } from "next-auth";
import type { Account, Profile, User } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { getServerSession } from "next-auth/next";
import Twitter, { type TwitterProfile } from "next-auth/providers/twitter";

import { accounts, sessions, users, verificationTokens } from "../db/schema";
import { highResolutionXAvatarUrl } from "../lib/avatar";

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
type XProfileUser = User & {
  xHandle?: string | null;
};

const X_OAUTH_TIMEOUT_MS = 30000;

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

function getStringField(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
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

function normalizeProxyUrl(proxyUrl: string): string {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(proxyUrl) ? proxyUrl : `http://${proxyUrl}`;
}

function getXOAuthHttpOptions() {
  const proxyUrl = firstString(
    process.env.AUTH_PROXY_URL,
    process.env.HTTPS_PROXY,
    process.env.HTTP_PROXY,
    process.env.ALL_PROXY,
  );

  if (!proxyUrl) {
    return {
      timeout: X_OAUTH_TIMEOUT_MS,
    };
  }

  return {
    timeout: X_OAUTH_TIMEOUT_MS,
    agent: new HttpsProxyAgent(normalizeProxyUrl(proxyUrl)),
  };
}

function getNormalizedProfile(profile: unknown): Record<string, unknown> | null {
  return isRecord(profile) ? profile : null;
}

function mapTwitterProfile(profile: TwitterProfile): XProfileUser {
  return {
    id: profile.data.id,
    name: profile.data.name,
    email: null,
    image: highResolutionXAvatarUrl(profile.data.profile_image_url),
    xHandle: profile.data.username,
  };
}

function getTwitterProvider() {
  return {
    ...Twitter<TwitterProfile>({
      clientId: process.env.AUTH_X_ID ?? "",
      clientSecret: process.env.AUTH_X_SECRET ?? "",
      version: "2.0",
      authorization: {
        params: {
          scope: "users.read tweet.read",
        },
      },
      profile: mapTwitterProfile,
    }),
    httpOptions: getXOAuthHttpOptions(),
    profile: mapTwitterProfile,
  };
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
  const normalizedProfile = getNormalizedProfile(profile);
  const xHandle = normalizeXHandle(
    firstString(
      typeof data?.username === "string" ? data.username : null,
      getStringField(normalizedProfile, "xHandle"),
      getStringField(normalizedProfile, "username"),
    ),
  );

  return {
    xId: account.providerAccountId,
    xHandle,
    displayName: firstString(
      typeof data?.name === "string" ? data.name : null,
      getStringField(normalizedProfile, "name"),
      user?.name,
    ),
    avatarUrl: highResolutionXAvatarUrl(
      firstString(
        typeof data?.profile_image_url === "string" ? data.profile_image_url : null,
        getStringField(normalizedProfile, "image"),
        user?.image,
      ),
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
  providers: [getTwitterProvider()],
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
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
