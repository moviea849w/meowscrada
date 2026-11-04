// render-doodles.mjs — hand-drawn annotation overlays with Rough.js
//
// Renders sketchy marks (circles, arrows, underlines, brackets, hatching) to a
// TRANSPARENT PNG that gets composited over a scene still. Because the source is
// medieval manuscripts and woodcuts, hand-drawn annotation reads as "someone is
// explaining this to you" rather than as UI.
//
// Runs on the node `canvas` package — no headless browser.
//
// Usage:
//   node .temp/render-doodles.mjs --spec doodles.json --out overlay.png
//
// doodles.json:
//   { "width": 1920, "height": 1080, "color": "#d8a54a", "seed": 7,
//     "marks": [
//       { "type": "circle", "x": 900, "y": 400, "w": 320, "h": 240 },
//       { "type": "arrow", "from": [400, 800], "to": [880, 430] },
//       { "type": "underline", "x": 200, "y": 900, "w": 600 },
//       { "type": "box", "x": 100, "y": 700, "w": 500, "h": 200 },
//       { "type": "bracket", "x": 1400, "y": 300, "h": 400, "side": "left" },
//       { "type": "cross", "x": 300, "y": 300, "size": 90 },
//       { "type": "hatch", "x": 100, "y": 100, "w": 300, "h": 200 },
//       { "type": "text", "x": 300, "y": 200, "text": "1399", "size": 64 }
//     ] }

import { createCanvas } from "canvas";
import rough from "roughjs";
import { readFile, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };

const spec = JSON.parse(await readFile(arg("spec", "doodles.json"), "utf8"));
const OUT = arg("out", "overlay.png");

const W = spec.width ?? 1920;
const H = spec.height ?? 1080;
const COLOR = spec.color ?? "#d8a54a";

const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");
const rc = rough.canvas(canvas);

// Rough.js v4: randomness is controlled by a per-shape `seed` option (no global reseed).
const BASE_SEED = spec.seed ?? 1;

for (const [i, m] of (spec.marks ?? []).entries()) {
  // stable per-mark seed: reproducible renders, but marks don't look identical
  const seed = BASE_SEED * 1000 + i * 37;

  // shared sketch style: thin, slightly rough, no fill
  const stroke = {
    stroke: m.color ?? COLOR,
    strokeWidth: m.strokeWidth ?? 5,
    roughness: m.roughness ?? 1.6,
    bowing: 1.2,
    seed,
  };
  const thick = { ...stroke, strokeWidth: m.strokeWidth ?? 7 };

  switch (m.type) {
    case "circle":
      rc.ellipse(m.x, m.y, m.w, m.h, { ...stroke, roughness: m.roughness ?? 2.2 });
      // second loose pass = looks hand-drawn, like a pencil going round twice
      rc.ellipse(m.x + 4, m.y - 3, m.w + 10, m.h - 6, {
        ...stroke,
        roughness: 2.6,
        strokeWidth: 3,
        seed: seed + 11,
      });
      break;

    case "box":
      rc.rectangle(m.x, m.y, m.w, m.h, { ...stroke, roughness: m.roughness ?? 1.8 });
      break;

    case "underline":
      rc.line(m.x, m.y, m.x + m.w, m.y + (m.dy ?? 2), thick);
      break;

    case "arrow": {
      rc.line(m.from[0], m.from[1], m.to[0], m.to[1], thick);
      // two short strokes for the head
      const ang = Math.atan2(m.to[1] - m.from[1], m.to[0] - m.from[0]);
      const len = m.head ?? 34;
      for (const d of [Math.PI * 0.82, -Math.PI * 0.82]) {
        rc.line(
          m.to[0], m.to[1],
          m.to[0] + Math.cos(ang + d) * len,
          m.to[1] + Math.sin(ang + d) * len,
          thick,
        );
      }
      break;
    }

    case "bracket": {
      const dir = m.side === "right" ? 1 : -1;
      const hook = m.hook ?? 26;
      rc.line(m.x, m.y, m.x, m.y + m.h, thick);
      rc.line(m.x, m.y, m.x + dir * hook, m.y, thick);
      rc.line(m.x, m.y + m.h, m.x + dir * hook, m.y + m.h, thick);
      break;
    }

    case "cross": {
      const s = (m.size ?? 80) / 2;
      rc.line(m.x - s, m.y - s, m.x + s, m.y + s, thick);
      rc.line(m.x + s, m.y - s, m.x - s, m.y + s, thick);
      break;
    }

    case "hatch":
      rc.rectangle(m.x, m.y, m.w, m.h, {
        ...stroke,
        strokeWidth: 3,
        fill: m.color ?? COLOR,
        fillStyle: m.fillStyle ?? "hachure",
        hachureGap: m.gap ?? 9,
        fillWeight: 2,
        roughness: 2,
      });
      break;

    case "text":
      // plain text on the canvas, kept here so a doodle spec is one file
      ctx.save();
      ctx.fillStyle = m.color ?? COLOR;
      ctx.font = `800 ${m.size ?? 56}px Poppins, sans-serif`;
      ctx.textAlign = m.align ?? "left";
      ctx.fillText(m.text, m.x, m.y);
      ctx.restore();
      break;

    default:
      console.warn(`! unknown mark type: ${m.type}`);
  }
}

await writeFile(OUT, canvas.toBuffer("image/png"));
console.log(`✓ ${OUT} (${(spec.marks ?? []).length} marks)`);
