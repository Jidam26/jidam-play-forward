"use client";

import { useEffect, useState } from "react";

/**
 * Auto-advancing carousel of plain numbered placeholder slides -- swap
 * `slideCount` worth of real photos in once they're available; this just
 * proves out the layout/motion without pretending to be real images.
 */
export function ImageCarousel({ slideCount = 5, label }: { slideCount?: number; label: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slideCount), 3000);
    return () => clearInterval(id);
  }, [slideCount]);

  return (
    <div className="mt-4">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-navy/10">
        {Array.from({ length: slideCount }, (_, i) => (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-navy/40 transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0 }}
            aria-hidden={i !== index}
          >
            {label} photo {i + 1}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {Array.from({ length: slideCount }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i === index ? "bg-gold" : "bg-navy/15"}`}
          />
        ))}
      </div>
    </div>
  );
}
