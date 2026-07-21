import { describe, expect, it } from "vitest";

import { assertDemoSeedAllowed, isDemoUserId, shouldExposeDemoData } from "./demo-data";

describe("demo data boundaries", () => {
  it("recognizes only the reserved demo user prefix", () => {
    expect(isDemoUserId("demo_alice")).toBe(true);
    expect(isDemoUserId("demo-user")).toBe(false);
    expect(isDemoUserId("user_demo_alice")).toBe(false);
  });

  it("requires an explicit non-production flag before public demo data can appear", () => {
    expect(shouldExposeDemoData({ NODE_ENV: "development" })).toBe(false);
    expect(
      shouldExposeDemoData({ NODE_ENV: "development", TOKENRANK_SHOW_DEMO_DATA: "1" }),
    ).toBe(true);
    expect(
      shouldExposeDemoData({ NODE_ENV: "production", TOKENRANK_SHOW_DEMO_DATA: "1" }),
    ).toBe(false);
  });

  it("blocks demo seeding unless it is explicitly local", () => {
    expect(() => assertDemoSeedAllowed({ NODE_ENV: "development" })).toThrow(
      "Demo seeding is disabled",
    );
    expect(() =>
      assertDemoSeedAllowed({
        NODE_ENV: "development",
        TOKENRANK_ALLOW_DEMO_SEED: "1",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).not.toThrow();
    expect(() =>
      assertDemoSeedAllowed({
        NODE_ENV: "development",
        TOKENRANK_ALLOW_DEMO_SEED: "1",
        NEXT_PUBLIC_APP_URL: "https://tokenrank.org",
      }),
    ).toThrow("never allowed");
  });
});
