const X_PROFILE_IMAGE_HOST = "pbs.twimg.com";
const X_SMALL_AVATAR_SUFFIX = /_(?:mini|normal|bigger|200x200)(?=\.[^./]+$)/;

export function highResolutionXAvatarUrl(src?: string | null): string | null {
  if (!src) {
    return null;
  }

  try {
    const url = new URL(src);
    if (url.hostname.toLowerCase() !== X_PROFILE_IMAGE_HOST) {
      return src;
    }

    url.pathname = url.pathname.replace(X_SMALL_AVATAR_SUFFIX, "_400x400");
    return url.toString();
  } catch {
    return src;
  }
}
