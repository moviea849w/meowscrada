// assets.ts — the shared drawing primitives every scene is built from.
//
// Each export returns a React element tree (SVG). Scenes are pure functions of
// `t` (0..1) that compose these, so the same building blocks give a consistent
// look across the whole episode without a template per scene.

import type { ReactNode } from "react";
import { C, ease, win } from "./theme.ts";

export type Pt = [number, number];

/** Straight line from a to b, revealed up to `p` (0..1). */
export function arrow(a: Pt, b: Pt, p = 1, color = C.heat, width = 5): ReactNode {
  const q = ease(p);
  if (q <= 0.001) return null;
  const x2 = a[0] + (b[0] - a[0]) * q;
  const y2 = a[1] + (b[1] - a[1]) * q;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const head = 18;
  const hx = (s: number) => x2 - Math.cos(ang + s) * head;
  const hy = (s: number) => y2 - Math.sin(ang + s) * head;
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" />
      {q > 0.9 ? (
        <polygon points={`${x2},${y2} ${hx(0.45)},${hy(0.45)} ${hx(-0.45)},${hy(-0.45)}`} fill={color} />
      ) : null}
    </g>
  );
}

/** A curved arrow along a circle of radius r around cx,cy. */
export function arcArrow(cx: number, cy: number, r: number, from: number, to: number, p = 1, color = C.heat, width = 5): ReactNode {
  const q = ease(p);
  if (q <= 0.001) return null;
  const end = from + (to - from) * q;
  const pt = (deg: number): Pt => [cx + Math.cos((deg * Math.PI) / 180) * r, cy + Math.sin((deg * Math.PI) / 180) * r];
  const [sx, sy] = pt(from);
  const [ex, ey] = pt(end);
  const large = Math.abs(end - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  // tangent direction at the end, for the arrowhead
  const tangent = end + (to > from ? 90 : -90);
  const tx = Math.cos((tangent * Math.PI) / 180);
  const ty = Math.sin((tangent * Math.PI) / 180);
  const head = 20;
  const hx1 = ex - tx * head - ty * head * 0.5;
  const hy1 = ey - ty * head + tx * head * 0.5;
  const hx2 = ex - tx * head + ty * head * 0.5;
  const hy2 = ey - ty * head - tx * head * 0.5;
  return (
    <g>
      <path d={`M${sx},${sy}A${r},${r} 0 ${large} ${sweep} ${ex},${ey}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
      {q > 0.9 ? <polygon points={`${ex},${ey} ${hx1},${hy1} ${hx2},${hy2}`} fill={color} /> : null}
    </g>
  );
}

/** Text label with a subtle dark plate so it reads over any background. */
export function label(
  x: number,
  y: number,
  text: string,
  opts: { size?: number; color?: string; weight?: number; anchor?: "start" | "middle" | "end"; opacity?: number } = {},
): ReactNode {
  const { size = 26, color = C.ink, weight = 600, anchor = "start", opacity = 1 } = opts;
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      fontFamily="Poppins, sans-serif"
      opacity={opacity}
    >
      {text}
    </text>
  );
}

/** Fade a group in over t = [from, to]. */
export function fade(t: number, from: number, to: number, children: ReactNode): ReactNode {
  const o = ease(win(t, from, to));
  if (o <= 0.001) return null;
  return <g opacity={o}>{children}</g>;
}

/** Move a group vertically in from below (the standard entrance). */
export function rise(t: number, from: number, to: number, dist: number, children: ReactNode): ReactNode {
  const o = ease(win(t, from, to));
  if (o <= 0.001) return null;
  return (
    <g opacity={o} transform={`translate(0 ${(1 - o) * dist})`}>
      {children}
    </g>
  );
}
