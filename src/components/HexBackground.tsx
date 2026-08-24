"use client";

import { useEffect, useMemo, useState } from "react";

type Cell = { cx: number; cy: number; isPentagon: boolean; key: string };

const VIEW_W = 1200;
const VIEW_H = 800;
const R = 42; // hex circumradius
const PENTAGON_R = R * 0.72; // inset so the pentagon overlay sits inside its hex cell

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const angle = k * (Math.PI / 3); // flat-top hexagon
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function pentagonPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 5; k++) {
    const angle = -Math.PI / 2 + k * ((2 * Math.PI) / 5); // point-up pentagon
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

/**
 * The deterministic cell grid -- same on server and client, so no hydration
 * mismatch. A standard flat-top hex tiling (tiles the plane edge-to-edge,
 * no gaps) with a sparse, evenly-spread subset of cells marked to also get
 * a pentagon panel drawn inset on top -- the classic soccer-ball paneling,
 * flattened out.
 */
function buildGrid(): Cell[] {
  const cells: Cell[] = [];
  const colSpacing = 1.5 * R;
  const rowSpacing = Math.sqrt(3) * R;
  const cols = Math.ceil(VIEW_W / colSpacing) + 3;
  const rows = Math.ceil(VIEW_H / rowSpacing) + 3;

  for (let col = -1; col < cols; col++) {
    const cx = col * colSpacing;
    const rowOffset = col % 2 !== 0 ? rowSpacing / 2 : 0;
    for (let row = -1; row < rows; row++) {
      const cy = row * rowSpacing + rowOffset;
      const isPentagon = (((col * 3 + row * 5) % 11) + 11) % 11 === 0;
      cells.push({ cx, cy, isPentagon, key: `${col}-${row}` });
    }
  }
  return cells;
}

/**
 * A grid of connected hexagon panels across the hero -- tiled edge-to-edge,
 * no gaps -- with pentagon panels inset on a sparse, evenly-spread subset
 * of cells for the classic soccer-ball look. The base grid is a static,
 * dim outline (safe for SSR); a random subset of panels softly glow from
 * within on an independent, staggered loop -- computed client-side after
 * mount so the randomness never causes a server/client mismatch.
 */
export function HexBackground() {
  const cells = useMemo(buildGrid, []);
  const [highlighted, setHighlighted] = useState<(Cell & { delay: number; duration: number })[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setHighlighted(
      cells
        .filter(() => Math.random() < 0.035)
        .map((c) => ({ ...c, delay: Math.random() * 9, duration: 3.5 + Math.random() * 3 }))
    );
  }, [cells]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="panel-glow-fill" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="var(--cinema-gold)" stopOpacity="0.85" />
          <stop offset="70%" stopColor="var(--cinema-gold)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--cinema-gold)" stopOpacity="0" />
        </radialGradient>
        <filter id="panel-glow-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Base tiling -- always visible, gives the connected-panel structure */}
      <g fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
        {cells.map((c) => (
          <polygon key={c.key} points={hexPoints(c.cx, c.cy, R)} />
        ))}
      </g>
      <g fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.14)" strokeWidth="1">
        {cells
          .filter((c) => c.isPentagon)
          .map((c) => (
            <polygon key={`p-${c.key}`} points={pentagonPoints(c.cx, c.cy, PENTAGON_R)} />
          ))}
      </g>

      {/* Random panels glowing softly from within, on an independent loop.
          A radial gradient (bright center, fading to transparent at the
          panel's own edge) gives the "lit from inside" look rather than a
          flat color swap. */}
      <g filter="url(#panel-glow-blur)" fill="url(#panel-glow-fill)">
        {highlighted.map((c) => (
          <polygon
            key={`h-${c.key}`}
            points={c.isPentagon ? pentagonPoints(c.cx, c.cy, PENTAGON_R) : hexPoints(c.cx, c.cy, R)}
            className="cinema-motion"
            style={{ opacity: 0, animation: `panel-glow ${c.duration}s ease-in-out ${c.delay}s infinite` }}
          />
        ))}
      </g>
    </svg>
  );
}
