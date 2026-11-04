// render-frames.tsx — render a scene as a SEQUENCE of keyframes for 2D animation.
//
// Instead of one still per scene, this writes N PNGs across the scene duration.
// ffmpeg then interpolates or crossfades them into real motion.
//
// Usage:
//   node .temp/<slug>/render-frames.mjs --spec frame.json --outdir frames/03 --n 24
//
// frame.json:
//   { "template": "anim", "animate": "adenosine", "kicker": "...", "text": "...",
//     "accent": "...", "sub": "...", "panel": "3" }
//
// Output: <outdir>/000.png ... <outdir>/(n-1).png  (1080x1920 or 1920x1080 per --w/--h)

import { render } from "takumi-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderAnimated } from "./storyboard-templates.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

async function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    try {
      await readFile(join(dir, "package.json"));
      await readFile(join(dir, "assets", "fonts", "Poppins-Bold.ttf"));
      return dir;
    } catch {
      const up = dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  }
  return start;
}
const ROOT = await findRoot(HERE);
const FONT_DIR = join(ROOT, "assets", "fonts");

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const spec = JSON.parse(await readFile(arg("spec", "frame.json"), "utf8"));
const OUTDIR = arg("outdir", "frames");
const N = parseInt(arg("n", "24"), 10);
const WIDTH = parseInt(arg("w", "1920"), 10);
const HEIGHT = parseInt(arg("h", "1080"), 10);

await mkdir(OUTDIR, { recursive: true });

const font = async (file, weight) => ({
  name: "Poppins",
  data: await readFile(join(FONT_DIR, file)),
  weight,
  style: "normal",
});

const fonts = [
  await font("Poppins-SemiBold.ttf", 600),
  await font("Poppins-Bold.ttf", 700),
  await font("Poppins-ExtraBold.ttf", 800),
];

const C = {
  paper: "#f4ede1",
  ink: "#1d1a16",
  inkDim: "#6f6659",
  accent: "#c8452a",
  accentSoft: "#e8a08f",
};

// landscape episodes use the dark documentary palette; vertical uses paper
const landscape = WIDTH > HEIGHT;
const PAL = landscape
  ? { paper: "#0b0a09", ink: "#f5f2ea", inkDim: "#b9b3a5", accent: "#d8a54a", accentSoft: "#8a6a2a" }
  : C;

for (let i = 0; i < N; i++) {
  const t = N === 1 ? 1 : i / (N - 1);
  const node = renderAnimated(spec, PAL, t, WIDTH, HEIGHT);
  const png = await render(node, { width: WIDTH, height: HEIGHT, format: "png", fonts });
  await writeFile(join(OUTDIR, `${String(i).padStart(3, "0")}.png`), png);
}

console.log(`✓ ${OUTDIR} (${N} frames)`);
