"use client";

import { useEffect, useState } from "react";

import { highResolutionXAvatarUrl } from "@/src/lib/avatar";

export function ProfileAvatar({
  className = "size-11",
  fallbackTextClassName = "text-sm",
  name,
  src,
}: {
  className?: string;
  fallbackTextClassName?: string;
  name: string;
  src?: string | null;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const displaySrc = highResolutionXAvatarUrl(src);

  useEffect(() => {
    if (!displaySrc) {
      return;
    }

    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) setLoadedSrc(displaySrc);
    };
    image.onerror = () => {
      if (active) setLoadedSrc(null);
    };
    image.src = displaySrc;

    return () => {
      active = false;
    };
  }, [displaySrc]);

  if (displaySrc && loadedSrc === displaySrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displaySrc}
        alt=""
        className={`${className} object-cover`}
        onError={() => setLoadedSrc(null)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} ${fallbackTextClassName} flex items-center justify-center bg-[color:var(--tr-gold)] font-black uppercase text-[#080b07]`}
    >
      {name.trim().slice(0, 1) || "T"}
    </span>
  );
}
