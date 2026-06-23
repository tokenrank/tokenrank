import { describe, expect, it } from "vitest";
import { getXIdentityUpdate } from "./config";

describe("getXIdentityUpdate", () => {
  it("extracts stable Twitter v2 identity fields for user sync", () => {
    const update = getXIdentityUpdate({
      account: {
        provider: "twitter",
        providerAccountId: "123456",
      },
      profile: {
        data: {
          id: "123456",
          name: "Token Rank",
          username: "TokenRankHQ",
          profile_image_url: "https://pbs.twimg.com/profile_images/avatar.jpg",
        },
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
    expect(update?.updatedAt).toBeInstanceOf(Date);
  });
});
