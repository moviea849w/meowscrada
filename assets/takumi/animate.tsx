// animate.tsx — keyframe sequences for 2D animated panels.
//
// The trick: we can't draw 30 frames a second on this box. But we don't need to.
// A scene is rendered as N keyframes at, say, 4 per second, and ffmpeg's `minterpolate`
// (or a plain xfade between keyframes) fills the gaps. Drawing "on twos" is a real
// animation style — it's what hand-drawn cartoons did for decades — and it costs
// 4 stills per second instead of 30.
//
// Each animated drawing is a pure function of `t` (0..1 across the scene):
//   draw: (t, c) => ReactNode
//
// Registered in ANIMATIONS by the scene's "animate" key. The renderer calls it once
// per keyframe with a different t, so every frame is genuinely different — not a
// zoom of the same picture.

import type { ReactNode } from "react";

export type Palette = {
  paper: string;
  ink: string;
  inkDim: string;
  accent: string;
  accentSoft: string;
};

const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out cubic
const clamp = (v: number) => Math.min(1, Math.max(0, v));

// window: 0 before `from`, ramps to 1 by `to`
const step = (t: number, from: number, to: number) => clamp((t - from) / (to - from));

const Bar = ({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) => (
  <div style={{ display: "flex", position: "absolute", left: x, top: y, width: w, height: h, background: fill, borderRadius: 4 }} />
);

const Ring = ({ x, y, size, stroke, thick = 6 }: { x: number; y: number; size: number; stroke: string; thick?: number }) => (
  <div style={{ display: "flex", position: "absolute", left: x, top: y, width: size, height: size, border: `${thick}px solid ${stroke}`, borderRadius: size }} />
);

// ---------------------------------------------------------------- animations

// adenosine building up in a skull, then a "cleaning crew" flushing it out.
// t 0..0.55 build, 0.55..0.8 hold, 0.8..1 flush.
const adenosine = (t: number, c: Palette): ReactNode => {
  const n = 28;
  const build = ease(step(t, 0.02, 0.55));
  const flush = ease(step(t, 0.8, 1));
  const dots = [];
  for (let i = 0; i < n; i++) {
    // pseudo-random but stable positions, kept inside the skull
    const gx = (i * 97) % 430;
    const gy = ((i * 53) % 380) + 80;
    const appear = clamp(build * 1.35 - (i / n) * 0.35);
    if (appear <= 0.01) continue;
    // on flush, each dot slides right and out of the head
    const dx = flush * (420 + (i % 5) * 40);
    const dy = flush * (((i % 7) - 3) * 22);
    dots.push(
      <div
        key={i}
        style={{
          display: "flex",
          position: "absolute",
          left: 250 + gx + dx,
          top: 90 + gy + dy,
          width: 20,
          height: 20,
          background: c.accent,
          borderRadius: 20,
          opacity: appear * (1 - flush * 0.85),
        }}
      />,
    );
  }
  return (
    <>
      {/* skull */}
      <Ring x={190} y={30} size={500} stroke={c.ink} thick={10} />
      <Bar x={350} y={520} w={240} h={10} fill={c.ink} />
      {dots}
      {/* the flush arrow, drawn as a shaft + head so it needs no font glyph */}
      {flush > 0.05 ? (
        <>
          <Bar x={760} y={250} w={Math.round(130 * flush)} h={8} fill={c.ink} />
          <Bar x={880} y={222} w={34} h={8} fill={c.ink} />
          <Bar x={880} y={278} w={34} h={8} fill={c.ink} />
        </>
      ) : null}
    </>
  );
};

// a waveform that appears left to right, sample by sample
const waveDraw = (t: number, c: Palette, invert = false): ReactNode => {
  const n = 26;
  const reveal = step(t, 0.02, 0.75);
  const bars = [];
  for (let i = 0; i < n; i++) {
    const phase = (i / (n - 1)) * Math.PI * 4;
    const s = Math.sin(phase) * (invert ? -1 : 1);
    const shown = i / (n - 1) <= reveal;
    const grow = clamp((reveal * n - i) / 3);
    if (!shown) continue;
    const h = Math.max(6, Math.abs(s) * 250 * grow);
    const base = 300;
    bars.push(
      <Bar
        key={i}
        x={40 + i * 34}
        y={s >= 0 ? base - h : base}
        w={24}
        h={h}
        fill={s < 0 ? c.accent : c.ink}
      />,
    );
  }
  return (
    <>
      <Bar x={20} y={296} w={900} h={4} fill={c.inkDim} />
      {bars}
    </>
  );
};

const waveIn = (t: number, c: Palette) => waveDraw(t, c, false);
const waveFlip = (t: number, c: Palette) => waveDraw(t, c, true);

// two waves converge and flatten: the cancellation beat
const cancel = (t: number, c: Palette): ReactNode => {
  const n = 26;
  const close = ease(step(t, 0.1, 0.7));
  const flat = ease(step(t, 0.7, 0.95));
  const bars = [];
  for (let i = 0; i < n; i++) {
    const s = Math.sin((i / (n - 1)) * Math.PI * 4);
    const amp = 220 * (1 - flat);
    const sep = 90 * (1 - close);
    const h = Math.max(5, Math.abs(s) * amp);
    const top = 300 - sep - h;
    bars.push(<Bar key={`a${i}`} x={40 + i * 34} y={top} w={24} h={h} fill={c.ink} />);
    bars.push(<Bar key={`b${i}`} x={40 + i * 34} y={300 + sep} w={24} h={h} fill={c.accent} />);
  }
  return (
    <>
      <Bar x={20} y={296} w={900} h={4} fill={c.inkDim} />
      {bars}
    </>
  );
};

// a clock hand sweeping, then stopping — the "day count" beat
const clock = (t: number, c: Palette): ReactNode => {
  const sweep = ease(step(t, 0.02, 0.85));
  const angle = sweep * Math.PI * 1.6;
  const cx = 470, cy = 380, len = 260;
  return (
    <>
      <Ring x={cx - 300} y={cy - 300} size={600} stroke={c.ink} thick={12} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <Bar
            key={i}
            x={cx + Math.cos(a) * 250 - 5}
            y={cy + Math.sin(a) * 250 - 5}
            w={10}
            h={10}
            fill={c.ink}
          />
        );
      })}
      <Bar x={cx - 4} y={cy - len} w={8} h={len + 8} fill={c.accent} />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: cx - 4,
          top: cy - len,
          width: 8,
          height: len + 8,
          background: c.accent,
          transformOrigin: "50% 100%",
          transform: `rotate(${(angle * 180) / Math.PI}deg)`,
          borderRadius: 4,
        }}
      />
      <Bar x={cx - 18} y={cy - 18} w={36} h={36} fill={c.ink} />
    </>
  );
};

// bars growing one at a time — "more pressure, more of it"
const stacking = (t: number, c: Palette): ReactNode => {
  const n = 9;
  const bars = [];
  for (let i = 0; i < n; i++) {
    const g = ease(clamp((t - i * 0.07) / 0.25));
    if (g <= 0.01) continue;
    const h = 60 + i * 46 * g;
    bars.push(
      <Bar key={i} x={80 + i * 96} y={740 - h} w={64} h={h} fill={i === n - 1 ? c.accent : c.ink} />,
    );
  }
  return (
    <>
      <Bar x={60} y={740} w={880} h={10} fill={c.ink} />
      {bars}
    </>
  );
};

// a person's silhouette with patches lighting up as "local sleep" switches off
const patches = (t: number, c: Palette): ReactNode => {
  const off = step(t, 0.15, 0.9);
  const cells = [];
  const cols = 7, rows = 6;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const i = r * cols + col;
      const threshold = ((i * 37) % 100) / 100;
      const sleeping = off > threshold;
      cells.push(
        <div
          key={i}
          style={{
            display: "flex",
            position: "absolute",
            left: 60 + col * 120,
            top: 40 + r * 110,
            width: 96,
            height: 86,
            background: sleeping ? c.inkDim : c.accent,
            borderRadius: 10,
            opacity: sleeping ? 0.25 : 1,
          }}
        />,
      );
    }
  }
  return <>{cells}</>;
};

export const ANIMATIONS: Record<string, (t: number, c: Palette) => ReactNode> = {
  adenosine,
  "wave-in": waveIn,
  "wave-flip": waveFlip,
  cancel,
  clock,
  stacking,
  patches,
};

export function animationNames(): string[] {
  return Object.keys(ANIMATIONS);
}
