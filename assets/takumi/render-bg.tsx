// render-bg.tsx — render reusable background plates (textures, grids, vignettes)
// with Takumi. No licensing questions: everything is generated.
//
// Usage:
//   node .temp/render-bg.mjs --kind paper --out bg-paper.png
//
// Kinds:
//   paper    — warm off-white grain, for quote/title cards over light
//   ink      — near-black with a soft center lift, for title cards
//   parchment— aged sepia tone with mottling, for history episodes
//   grid     — faint graph paper, for science/diagram episodes

import { render } from "takumi-js";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = HERE.includes("/.temp") ? join(HERE, "..") : join(HERE, "..", "..");

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };

const KIND = arg("kind", "ink");
const OUT = arg("out", "bg.png");
const W = Number(arg("w", 1920));
const H = Number(arg("h", 1080));

// deterministic pseudo-random so renders are reproducible
let seed = 20261104;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const palettes = {
  paper: { base: "#f4efe6", speck: "rgba(120,104,84,0.10)", wash: "rgba(255,255,255,0.55)" },
  ink: { base: "#0b0a09", speck: "rgba(255,255,255,0.045)", wash: "rgba(216,165,74,0.05)" },
  parchment: { base: "#d9c8a8", speck: "rgba(94,72,44,0.13)", wash: "rgba(255,244,222,0.4)" },
  grid: { base: "#12141a", speck: "rgba(255,255,255,0.06)", wash: "rgba(120,170,255,0.04)" },
};

const p = palettes[KIND] || palettes.ink;

const specks = Array.from({ length: 90 }, () => ({
  x: rnd() * W,
  y: rnd() * H,
  s: 2 + rnd() * 26,
  o: 0.25 + rnd() * 0.75,
}));

const Grid = () =>
  KIND === "grid"
    ? Array.from({ length: Math.floor(W / 80) }, (_, i) => (
        <div key={`v${i}`} style={{ position: "absolute", left: i * 80, top: 0, width: 1, height: H, background: "rgba(255,255,255,0.045)" }} />
      )).concat(
        Array.from({ length: Math.floor(H / 80) }, (_, i) => (
          <div key={`h${i}`} style={{ position: "absolute", left: 0, top: i * 80, width: W, height: 1, background: "rgba(255,255,255,0.045)" }} />
        )),
      )
    : null;

const node = (
  <div
    style={{
      display: "flex",
      position: "relative",
      width: W,
      height: H,
      background: p.base,
      overflow: "hidden",
    }}
  >
    {/* soft center lift */}
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        background: `radial-gradient(ellipse at 50% 45%, ${p.wash} 0%, rgba(0,0,0,0) 62%)`,
      }}
    />

    <Grid />

    {/* grain */}
    {specks.map((s, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: s.x,
          top: s.y,
          width: s.s,
          height: s.s,
          borderRadius: s.s,
          background: p.speck,
          opacity: s.o,
        }}
      />
    ))}

    {/* vignette */}
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.38) 100%)",
      }}
    />
  </div>
);

const png = await render(node, { width: W, height: H, format: "png" });
await writeFile(OUT, png);
console.log(`✓ ${OUT}`);
