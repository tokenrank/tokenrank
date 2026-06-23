import { describe, expect, it } from "vitest";
import type { OAuthConfig } from "next-auth/providers/oauth";
import type { TwitterProfile } from "next-auth/providers/twitter";
import { authOptions, getXIdentityUpdate } from "./config";

const rawTwitterProfile = {
  data: {
    id: "123456",
    name: "Token Rank",
    username: "TokenRankHQ",
    profile_image_url: "https://pbs.twimg.com/profile_images/avatar.jpg",
  },
} satisfies TwitterProfile;

function getTwitterProvider() {
  return authOptions.providers[0] as OAuthConfig<TwitterProfile>;
}

describe("getXIdentityUpdate", () => {
  it("extracts stable Twitter v2 identity fields for user sync", () => {
    const update = getXIdentityUpdate({
      account: {
        provider: "twitter",
        providerAccountId: "123456",
      },
      profile: rawTwitterProfile,
      user: {
        name: "Fallback Name",
        image: "https://example.com/fallback.jpg",
      },
    });

    expect(update).toMatchObject({
      xId: "123456",
      xHandle: "tokenrankhq",
      displayName: "Token Rank",
      avatarUrl: "https://pbs.twimg.com/profile_images/avatar.jpg",
    });
    expect(update?.updatedAt).toBeInstanceOf(Date);
  });

  it("extracts x handle from the provider-normalized sign-in event profile", () => {
    const update = getXIdentityUpdate({
      account: {
        provider: "twitter",
        providerAccountId: "123456",
      },
      profile: {
        id: "123456",
        name: "Token Rank",
        image: "https://pbs.twimg.com/profile_images/avatar.jpg",
        xHandle: "@TokenRankHQ",
      },
      user: {
        name: "Fallback Name",
        image: "https://example.com/fallback.jpg",
      },
    });

    expect(update).toMatchObject({
      xId: "123456",
      xHandle: "tokenrankhq",
      displayName: "Token Rank",
      avatarUrl: "https://pbs.twimg.com/profile_images/avatar.jpg",
    });
  });
});

describe("Twitter provider profile", () => {
  it("preserves the raw Twitter v2 username on the normalized profile", async () => {
    const profileCallback = getTwitterProvider().options?.profile;

    expect(profileCallback).toBeTypeOf("function");

    const normalized = await profileCallback?.(rawTwitterProfile, {} as never);

    expect(normalized).toMatchObject({
      id: "123456",
      name: "Token Rank",
      image: "https://pbs.twimg.com/profile_images/avatar.jpg",
      xHandle: "TokenRankHQ",
    });
  });
});
