const DEMO_USER_PREFIX = "demo_";

type Environment = Record<string, string | undefined>;

export function isDemoUserId(userId: string | null | undefined): boolean {
  return Boolean(userId?.startsWith(DEMO_USER_PREFIX));
}

export function shouldExposeDemoData(environment: Environment = process.env): boolean {
  return environment.NODE_ENV !== "production" && environment.TOKENRANK_SHOW_DEMO_DATA === "1";
}

export function assertDemoSeedAllowed(environment: Environment = process.env): void {
  if (environment.TOKENRANK_ALLOW_DEMO_SEED !== "1") {
    throw new Error(
      "Demo seeding is disabled. Set TOKENRANK_ALLOW_DEMO_SEED=1 in a non-production shell to continue.",
    );
  }

  const appUrl = environment.NEXT_PUBLIC_APP_URL?.trim().toLowerCase();
  const pointsAtCanonicalProduction = Boolean(
    appUrl && new URL(appUrl).hostname.replace(/^www\./, "") === "tokenrank.org",
  );

  if (environment.NODE_ENV === "production" || pointsAtCanonicalProduction) {
    throw new Error("Demo seeding is never allowed for the TokenRank production environment.");
  }
}
