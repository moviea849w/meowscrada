// earth.tsx — Earth scenes for "What if the Earth stopped spinning?".
//
// One export per beat. Each is a pure function of `t` (0..1 across the scene)
// so the keyframe renderer can sample it at any resolution. Everything is
// drawn from the real projection in globe.ts — no fake continents.
//
//   import { EARTH_SCENES } from "../svg/earth.tsx";
//
//   { "template": "anim", "animate": "earth-spin", "say": "...", "sub": "..." }

import type { ReactNode } from "react";
import { C, ease, win, clamp01 } from "./theme.ts";
import { W, H, LAND_PATH, GRATICULE, globeAt, project, CITIES } from "./globe.ts";
import { arcArrow, arrow, label, fade, rise, type Pt } from "./assets.tsx";

// ------------------------------------------------------------------ helpers

const Ring = ({ x, y, r, stroke, width = 4, opacity = 1 }: { x: number; y: number; r: number; stroke: string; width?: number; opacity?: number }) => (
  <circle cx={x} cy={y} r={r} fill="none" stroke={stroke} strokeWidth={width} opacity={opacity} />
);

/** Star field, deterministic so it never flickers between keyframes. */
const stars = (n = 90) => {
  const out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = ((i * 947) % 1600) + ((i * 13) % 7);
    const y = ((i * 571) % 900) + ((i * 29) % 5);
    const r = 1 + ((i * 37) % 10) / 10;
    const o = 0.25 + ((i * 53) % 60) / 100;
    out.push(<circle key={i} cx={x} cy={y} r={r} fill={C.ink} opacity={o} />);
  }
  return out;
};

/** Orbit ring + a planet on it. */
const orbit = (cx: number, cy: number, rx: number, ry: number, angleDeg: number, color = C.waterLit) => {
  const a = (angleDeg * Math.PI) / 180;
  return { ring: <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={3} opacity={0.55} />, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
};

/** Marker dot with a pulse, at a lon/lat on the flat map. */
const marker = (lon: number, lat: number, color = C.heat, pulse = 0) => {
  const [x, y] = project(lon, lat);
  return (
    <g key={`${lon},${lat}`}>
      <circle cx={x} cy={y} r={9 + pulse * 16} fill={color} opacity={0.25 * (1 - pulse)} />
      <circle cx={x} cy={y} r={8} fill={color} />
    </g>
  );
};

// ------------------------------------------------------------------- scenes

// 1. A globe seen from space, spinning. The calm before.
const spin = (t: number): ReactNode => {
  const g = globeAt(-40 + t * 70);
  return (
    <>
      {stars()}
      <circle cx={g.centre[0]} cy={g.centre[1]} r={g.radius * 1.12} fill={C.water} opacity={0.12} />
      <path d={g.sphere} fill={C.water} />
      <path d={g.land} fill={C.land} stroke={C.landDark} strokeWidth={1.5} />
      <path d={g.graticule} fill="none" stroke={C.waterLit} strokeWidth={1.5} opacity={0.35} />
      <path d={g.sphere} fill="none" stroke={C.waterLit} strokeWidth={3} opacity={0.8} />
      {arcArrow(g.centre[0], g.centre[1], g.radius * 1.2, -30, 40, win(t, 0.15, 0.9), C.heat, 6)}
      {label(g.centre[0] + g.radius * 1.05, g.centre[1] - g.radius * 0.85, "465 m/s", { size: 34, color: C.heat })}
    </>
  );
};

// 2. The map, with the equator band and the two places that matter.
const spinWide = (t: number): ReactNode => (
  <>
    <path d={LAND_PATH} fill={C.land} stroke={C.landDark} strokeWidth={1} />
    <path d={GRATICULE} fill="none" stroke={C.waterLit} strokeWidth={1.5} opacity={0.35} />
    <line x1={40} y1={450} x2={1560} y2={450} stroke={C.heat} strokeWidth={3} strokeDasharray="14 10" opacity={ease(win(t, 0.05, 0.3)) * 0.9} />
    {marker(CITIES.equator.lon, CITIES.equator.lat, C.heat, (t * 2) % 1)}
    {fade(t, 0.2, 0.45, label(project(0, 6)[0] + 20, project(0, 6)[1], "EQUATOR", { size: 24, color: C.heat, weight: 700 }))}
    {fade(t, 0.35, 0.6, label(project(CITIES.delhi.lon, CITIES.delhi.lat)[0] + 22, project(CITIES.delhi.lon, CITIES.delhi.lat)[1] + 6, "Delhi", { size: 28 }))}
    {fade(t, 0.45, 0.7, label(project(CITIES.newYork.lon, CITIES.newYork.lat)[0] + 22, project(CITIES.newYork.lon, CITIES.newYork.lat)[1], "New York", { size: 28 }))}
    {fade(t, 0.6, 0.85, label(1560, 120, "the equator moves fastest", { size: 26, color: C.dim, anchor: "end" }))}
  </>
);

// 3. The brake: the planet slows, the arrow shrinks, the ring stops.
const brake = (t: number): ReactNode => {
  const stop = ease(win(t, 0.05, 0.75));
  const speed = 1 - stop;
  const cx = 800;
  const cy = 440;
  const r = 300;
  return (
    <>
      {stars(40)}
      <Ring x={cx} y={cy} r={r} stroke={C.dim} width={2} opacity={0.6} />
      {/* the planet, dead still, at the centre of the dial */}
      <g transform={`translate(${cx} ${cy})`}>
        <circle r={150} fill={C.water} />
        <g transform="scale(0.3) translate(-800 -450)">
          <path d={LAND_PATH} fill={C.land} stroke={C.landDark} strokeWidth={3} />
        </g>
        <circle r={150} fill="none" stroke={C.waterLit} strokeWidth={3} />
      </g>
      {/* draw the arrows against a value that reaches exactly 0 at the same
          instant as the label — otherwise a hairline arc survives at 0.9% speed */}
      {speed > 0.001 ? arcArrow(cx, cy, r, -150, -150 + 190 * speed, 1, C.heat, 10) : null}
      {speed > 0.001 ? arcArrow(cx, cy, r, 30, 30 + 190 * speed, 1, C.heat, 10) : null}
      {fade(t, 0.02, 0.25, label(cx, cy - r - 60, "1,670 km/h", { size: 56, color: C.heat, anchor: "middle", weight: 700, opacity: Math.min(1, speed * 6) }))}
      {fade(t, 0.75, 0.95, (
        <g>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.calm} strokeWidth={5} />
          {label(cx, cy + r + 90, "0 km/h", { size: 64, color: C.calm, anchor: "middle", weight: 700 })}
        </g>
      ))}
      {fade(t, 0.85, 1, label(cx, cy + r + 146, "stopped.", { size: 30, color: C.dim, anchor: "middle" }))}
    </>
  );
};

// 4. Momentum: everything keeps going east. A row of people, all flung.
const fling = (t: number): ReactNode => {
  const go = ease(win(t, 0.1, 0.85));
  const people = [300, 500, 700, 900, 1100, 1300];
  return (
    <>
      <path d={LAND_PATH} fill={C.land} stroke={C.landDark} strokeWidth={1} opacity={0.35} />
      <line x1={40} y1={640} x2={1560} y2={640} stroke={C.dim} strokeWidth={6} />
      {people.map((x, i) => {
        const dx = go * (600 + i * 60);
        const dy = -go * (120 + i * 40);
        const rot = go * (25 + i * 6);
        return (
          <g key={x} transform={`translate(${x + dx} ${dy}) rotate(${rot} ${x} 640)`} opacity={1 - go * 0.15}>
            <circle cx={x} cy={600} r={26} fill={C.ink} />
            <rect x={x - 16} y={622} width={32} height={18} fill={C.ink} />
          </g>
        );
      })}
      {fade(t, 0.15, 0.4, (
        <g>
          {arrow([640, 380], [1180, 300], win(t, 0.2, 0.8), C.heat, 7)}
          {label(1180, 270, "1,670 km/h", { size: 40, color: C.heat, weight: 700 })}
        </g>
      ))}
      {fade(t, 0.5, 0.75, label(80, 120, "everything on the surface keeps moving east", { size: 26, color: C.dim }))}
    </>
  );
};

// 5. The day becomes a year: Earth on its orbit, one rotation per orbit.
const dayYear = (t: number): ReactNode => {
  const cx = 800;
  const cy = 470;
  const rx = 560;
  const ry = 200;
  const ang = -90 + t * 360;
  const o = orbit(cx, cy, rx, ry, ang);
  const sunR = 54;
  return (
    <>
      {stars(50)}
      {o.ring}
      <circle cx={cx} cy={cy} r={sunR} fill={C.heat} />
      <circle cx={cx} cy={cy} r={sunR * 1.6} fill={C.heat} opacity={0.18} />
      {label(cx, cy + sunR + 34, "Sun", { size: 22, color: C.dim, anchor: "middle" })}
      <g transform={`translate(${o.x} ${o.y})`}>
        <circle r={22} fill={C.water} />
        <circle r={22} fill="none" stroke={C.waterLit} strokeWidth={3} />
        <circle cx={22 * Math.cos((ang * Math.PI) / 180)} cy={22 * Math.sin((ang * Math.PI) / 180)} r={6} fill={C.ink} />
      </g>
      {fade(t, 0.35, 0.6, (
        <g>
          {label(120, 160, "1 rotation", { size: 30, color: C.calm })}
          {label(120, 200, "= 1 year", { size: 30, color: C.calm })}
        </g>
      ))}
      {fade(t, 0.6, 0.85, (
        <g>
          {label(1200, 160, "day: 12 h light", { size: 26, color: C.dim })}
          {label(1200, 200, "night: 6 months", { size: 26, color: C.dim })}
        </g>
      ))}
    </>
  );
};

// 6. Ocean water sliding to the poles: the planet with two bulges.
const oceanPoles = (t: number): ReactNode => {
  const g = globeAt(10);
  const pull = ease(win(t, 0.15, 0.9));
  const [cx, cy] = g.centre;
  const r = g.radius;
  const bulge = 1 + pull * 0.22;
  return (
    <>
      {stars(50)}
      <path d={g.sphere} fill={C.water} />
      <path d={g.land} fill={C.land} stroke={C.landDark} strokeWidth={1.5} />
      <ellipse cx={cx} cy={cy - r * 0.95} rx={r * 0.62 * (0.4 + pull * 0.6)} ry={r * 0.22 * bulge} fill={C.waterLit} opacity={0.85} />
      <ellipse cx={cx} cy={cy + r * 0.95} rx={r * 0.62 * (0.4 + pull * 0.6)} ry={r * 0.22 * bulge} fill={C.waterLit} opacity={0.85} />
      <path d={g.sphere} fill="none" stroke={C.waterLit} strokeWidth={3} />
      {fade(t, 0.2, 0.45, (
        <g>
          {arrow([cx - r - 60, cy - r * 0.4], [cx - r - 60, cy - r * 0.9], win(t, 0.25, 0.8), C.calm, 6)}
          {arrow([cx - r - 60, cy + r * 0.4], [cx - r - 60, cy + r * 0.9], win(t, 0.25, 0.8), C.calm, 6)}
          {label(cx - r - 90, cy, "water", { size: 26, color: C.calm, anchor: "end" })}
          {label(cx - r - 90, cy + 34, "piles up", { size: 26, color: C.calm, anchor: "end" })}
        </g>
      ))}
      {fade(t, 0.7, 0.95, label(cx + r + 60, cy - r * 0.2, "two oceans", { size: 30, color: C.heat, weight: 700 }))}
      {fade(t, 0.8, 1, label(cx + r + 60, cy + r * 0.2, "one dry ring", { size: 30, color: C.heat, weight: 700 }))}
    </>
  );
};

// 7. The wind stops: pressure stops evening out, storms stand still.
const weather = (t: number): ReactNode => {
  const stop = ease(win(t, 0.2, 0.8));
  const cx = 800;
  const cy = 430;
  const spins = 3;
  const rot = t * 300 * (1 - stop);
  return (
    <>
      <path d={LAND_PATH} fill={C.landDark} stroke={C.dim} strokeWidth={1} opacity={0.5} />
      {[0, 1, 2].map((i) => {
        const a = rot + i * 120;
        const rx = 200 + i * 90;
        const ry = 120 + i * 60;
        const p = (deg: number): Pt => [cx + Math.cos((deg * Math.PI) / 180) * rx, cy + Math.sin((deg * Math.PI) / 180) * ry];
        const pts: string[] = [];
        for (let k = 0; k <= 60; k++) {
          const q = p(a + k * 4);
          pts.push(`${k ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`);
        }
        return <path key={i} d={pts.join("")} fill="none" stroke={C.calm} strokeWidth={5} strokeLinecap="round" opacity={0.9} />;
      })}
      {fade(t, 0.75, 1, (
        <g>
          {label(cx, 120, "air stops moving", { size: 34, color: C.heat, anchor: "middle" })}
          {label(cx, 810, "and a storm just sits there", { size: 28, color: C.dim, anchor: "middle" })}
        </g>
      ))}
    </>
  );
};

// 8. The real numbers: three facts, one after another.
const numbers = (t: number): ReactNode => {
  const rows = [
    { n: "1,670 km/h", l: "how fast the equator moves", c: C.heat },
    { n: "23 h 56 m", l: "one turn, right now", c: C.ink },
    { n: "365 days", l: "one turn, if it stopped", c: C.calm },
  ];
  return (
    <>
      {rows.map((r, i) => (
        <g key={r.n}>
          {rise(t, i * 0.22, i * 0.22 + 0.18, 30, (
            <g>
              <line x1={140} y1={250 + i * 200} x2={1460} y2={250 + i * 200} stroke={C.dim} strokeWidth={1} opacity={0.6} />
              {label(140, 232 + i * 200, r.n, { size: 76, color: r.c, weight: 700 })}
              {label(140, 290 + i * 200, r.l, { size: 30, color: C.dim })}
            </g>
          ))}
        </g>
      ))}
    </>
  );
};

// 9. Half the planet on fire, half frozen: the simplest consequence.
const fireIce = (t: number): ReactNode => {
  const sweep = ease(win(t, 0.1, 0.85));
  const [sx] = project(0, 0);
  return (
    <>
      <path d={LAND_PATH} fill={C.land} stroke={C.landDark} strokeWidth={1} />
      <clipPath id="heatClip">
        <rect x={0} y={0} width={sx + 260 * sweep} height={H} />
      </clipPath>
      <clipPath id="iceClip">
        <rect x={sx + 260 * sweep} y={0} width={W - sx - 260 * sweep} height={H} />
      </clipPath>
      <g clipPath="url(#heatClip)">
        <rect x={0} y={0} width={sx + 260 * sweep} height={H} fill={C.heat} opacity={0.35} />
      </g>
      <g clipPath="url(#iceClip)">
        <rect x={sx + 260 * sweep} y={0} width={W - sx - 260 * sweep} height={H} fill={C.waterLit} opacity={0.35} />
      </g>
      {fade(t, 0.2, 0.5, label(60, 110, "6 months of sun", { size: 34, color: C.heat, weight: 700 }))}
      {fade(t, 0.3, 0.6, label(1540, 110, "6 months of dark", { size: 34, color: C.waterLit, weight: 700, anchor: "end" }))}
    </>
  );
};

// 10. Callback: the globe, back at normal speed, same framing as scene 1.
const callback = (t: number): ReactNode => {
  const g = globeAt(-40 + t * 20);
  return (
    <>
      {stars()}
      <path d={g.sphere} fill={C.water} />
      <path d={g.land} fill={C.land} stroke={C.landDark} strokeWidth={1.5} />
      <path d={g.graticule} fill="none" stroke={C.waterLit} strokeWidth={1.5} opacity={0.3} />
      {arcArrow(g.centre[0], g.centre[1], g.radius * 1.2, -30, 30, win(t, 0.1, 0.8), C.calm, 6)}
      {fade(t, 0.4, 0.75, label(800, 860, "still spinning.", { size: 34, color: C.calm, anchor: "middle" }))}
    </>
  );
};

// ---------------------------------------------------------------- registry

export const EARTH_SCENES: Record<string, (t: number) => ReactNode> = {
  "earth-spin": spin,
  "earth-spin-wide": spinWide,
  "earth-brake": brake,
  "earth-fling": fling,
  "earth-day-year": dayYear,
  "earth-ocean-poles": oceanPoles,
  "earth-weather": weather,
  "earth-numbers": numbers,
  "earth-fire-ice": fireIce,
  "earth-callback": callback,
};

export function earthSceneNames(): string[] {
  return Object.keys(EARTH_SCENES);
}
