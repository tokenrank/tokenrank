import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/src/lib/site";
import { getPublicProfileSitemapEntries } from "@/src/lib/users";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await publicProfiles();

  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/rules"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...profiles.map((profile) => ({
      url: absoluteUrl(`/u/${encodeURIComponent(profile.handle)}`),
      lastModified: profile.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

async function publicProfiles() {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    return await getPublicProfileSitemapEntries();
  } catch {
    return [];
  }
}
