import type { Metadata } from "next";

import { absoluteUrl, siteName } from "./site";

export const socialImageAlt = "TokenRank AI token leaderboard";
export const socialImageSize = {
  width: 1200,
  height: 630,
};

export const openGraphImageDescriptor = {
  url: absoluteUrl("/opengraph-image"),
  secureUrl: absoluteUrl("/opengraph-image"),
  alt: socialImageAlt,
  type: "image/png",
  ...socialImageSize,
};

export const twitterImageDescriptor = {
  url: absoluteUrl("/twitter-image"),
  secureUrl: absoluteUrl("/twitter-image"),
  alt: socialImageAlt,
  type: "image/png",
  ...socialImageSize,
};

type SocialMetadataOptions = {
  title: string;
  description: string;
  url: string;
  type?: "profile" | "website";
};

export function createSocialMetadata({
  title,
  description,
  url,
  type = "website",
}: SocialMetadataOptions): Pick<Metadata, "openGraph" | "twitter"> {
  const sharedOpenGraph = {
    title,
    description,
    url,
    siteName,
    locale: "en_US",
    images: [openGraphImageDescriptor],
  };

  return {
    openGraph:
      type === "profile"
        ? { ...sharedOpenGraph, type: "profile" }
        : { ...sharedOpenGraph, type: "website" },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [twitterImageDescriptor],
    },
  };
}
