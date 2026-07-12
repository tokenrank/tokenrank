"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!src) {
      return;
    }

    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) setLoadedSrc(src);
    };
    image.onerror = () => {
      if (active) setLoadedSrc(null);
    };
    image.src = src;

    return () => {
      active = false;
    };
  }, [src]);

  if (src && loadedSrc === src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
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
