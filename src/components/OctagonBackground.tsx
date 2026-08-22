"use client";

import { useEffect, useMemo, useState } from "react";

type Edge = { x1: number; y1: number; x2: number; y2: number; key: string };

const VIEW_W = 1200;
const VIEW_H = 800;
const SPACING = 110;
const RADIUS = 46;

function octagonVertices(cx: number, cy: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let k = 0; k < 8; k++) {
    const angle = Math.PI / 8 + k * (Math.PI / 4);
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return pts;
}

/** The deterministic edge grid -- same on server and client, so no hydration mismatch. */
function buildGrid(): Edge[] {
  const edges: Edge[] = [];
  const cols = Math.ceil(VIEW_W / SPACING) + 2;
  const rows = Math.ceil(VIEW_H / (SPACING * 0.87)) + 2;
  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * SPACING + (row % 2 !== 0 ? SPACING / 2 : 0);
      const cy = row * SPACING * 0.87;
      const pts = octagonVertices(cx, cy, RADIUS);
      for (let i = 0; i < 8; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % 8];
        edges.push({ x1, y1, x2, y2, key: `${row}-${col}-${i}` });
      }
    }
  }
  return edges;
}

/**
 * A grid of octagon outlines across the hero, like a soccer ball's panels
 * flattened out. The base grid is a static, dim white line-work (safe for
 * SSR); a random subset of edges glow gold on an independent, staggered
 * loop -- computed client-side after mount so the randomness never causes
 * a server/client mismatch.
 */
export function OctagonBackground() {
  const edges = useMemo(buildGrid, []);
  const [highlighted, setHighlighted] = useState<(Edge & { delay: number; duration: number })[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setHighlighted(
      edges
        .filter(() => Math.random() < 0.1)
        .map((e) => ({ ...e, delay: Math.random() * 6, duration: 2.5 + Math.random() * 3 }))
    );
  }, [edges]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke="rgba(255,255,255,0.09)" strokeWidth="1" fill="none">
        {edges.map((e) => (
          <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
        ))}
      </g>
      <g stroke="var(--cinema-gold)" strokeWidth="1.5" fill="none">
        {highlighted.map((e) => (
          <line
            key={`h-${e.key}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            className="cinema-motion"
            style={{ opacity: 0, animation: `octagon-pulse ${e.duration}s ease-in-out ${e.delay}s infinite` }}
          />
        ))}
      </g>
    </svg>
  );
}
