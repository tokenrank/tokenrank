import { describe, expect, it } from "vitest";

import { highResolutionXAvatarUrl } from "./avatar";

describe("highResolutionXAvatarUrl", () => {
  it("upgrades X profile thumbnails to the 400px variant", () => {
    expect(
      highResolutionXAvatarUrl(
        "https://pbs.twimg.com/profile_images/123/avatar_normal.jpg",
      ),
    ).toBe("https://pbs.twimg.com/profile_images/123/avatar_400x400.jpg");
  });

  it("leaves existing high-resolution and non-X images unchanged", () => {
    expect(
      highResolutionXAvatarUrl(
        "https://pbs.twimg.com/profile_images/123/avatar_400x400.jpg",
      ),
    ).toBe("https://pbs.twimg.com/profile_images/123/avatar_400x400.jpg");
    expect(highResolutionXAvatarUrl("https://example.com/avatar_normal.jpg")).toBe(
      "https://example.com/avatar_normal.jpg",
    );
  });

  it("preserves missing or malformed avatar values", () => {
    expect(highResolutionXAvatarUrl(null)).toBeNull();
    expect(highResolutionXAvatarUrl("not a url")).toBe("not a url");
  });
});
