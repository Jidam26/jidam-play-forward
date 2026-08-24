"use client";

import { useEffect, useRef } from "react";

// Static geometry for a flat, iconographic soccer ball -- a center pentagon
// with five seams radiating out to smaller pentagon caps, computed once by
// hand rather than at runtime (it never changes).
const PENTAGON = "0,-7 6.66,-2.16 4.11,5.66 -4.11,5.66 -6.66,-2.16";
const CENTER_PENTAGON = "50,35 64.27,45.37 58.82,62.13 41.18,62.13 35.73,45.37";
const SEAMS: { cap: [number, number]; rot: number }[] = [
  { cap: [69.4, 23.3], rot: 36 },
  { cap: [81.39, 60.2], rot: 108 },
  { cap: [50, 83], rot: 180 },
  { cap: [18.61, 60.2], rot: 252 },
  { cap: [30.6, 23.3], rot: 324 },
];

/**
 * A flat soccer-ball icon that floats gently in the hero (its own idle bob
 * runs independently) and turns as the page scrolls, like it's rolling.
 * It's fixed to the viewport -- rather than scrolling away with the hero
 * content, which only gave it ~150px of scroll before it left the screen --
 * so the spin is actually visible for the whole first scroll, then it
 * fades out once the hero has scrolled past so it doesn't linger over the
 * rest of the page. Rotation and fade are both driven by scroll position
 * (rAF-throttled, applied via refs so neither triggers a React re-render),
 * and both are skipped for prefers-reduced-motion.
 */
export function FloatingFootball() {
  const fadeRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (spinRef.current) spinRef.current.style.transform = `rotate(${y * 0.4}deg)`;
        if (fadeRef.current) {
          const fadeOver = Math.max(window.innerHeight * 0.9, 1);
          fadeRef.current.style.opacity = String(Math.max(1 - y / fadeOver, 0));
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={fadeRef}
      className="pointer-events-none fixed right-4 top-20 z-40 h-20 w-20 sm:right-12 sm:top-16 sm:h-32 sm:w-32"
      aria-hidden
    >
      <div className="cinema-motion h-full w-full" style={{ animation: "football-float 4.5s ease-in-out infinite" }}>
        <div ref={spinRef} className="h-full w-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <defs>
              <radialGradient id="ball-shade" cx="38%" cy="32%" r="75%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#c7cbd1" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#ball-shade)" stroke="#1c1f26" strokeWidth="1.5" />
            <polygon points={CENTER_PENTAGON} fill="#161a22" />
            {SEAMS.map((s, i) => (
              <g key={i}>
                <line x1="50" y1="50" x2={s.cap[0]} y2={s.cap[1]} stroke="#161a22" strokeWidth="2.2" />
                <g transform={`translate(${s.cap[0]} ${s.cap[1]}) rotate(${s.rot})`}>
                  <polygon points={PENTAGON} fill="#161a22" />
                </g>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
