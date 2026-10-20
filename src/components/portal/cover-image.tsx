"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One album cover in a category's strip. If the catalogue's image server no longer has it,
 * an empty tile shows instead of a broken-image icon.
 */
export function CoverImage({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    // It may have failed before the page came to life, when onError wasn't listening yet.
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setBroken(true);
  }, []);
  if (broken) return <span className="aspect-square w-full rounded-[3px] bg-ink ring-1 ring-white/10" />;
  return (
    // Tiny thumbnails from the music catalogue's own image server; no resizing needed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      title={label}
      width={56}
      height={56}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="aspect-square w-full rounded-[3px] bg-ink object-cover opacity-80 ring-1 ring-white/10 transition-opacity group-hover:opacity-100"
    />
  );
}
