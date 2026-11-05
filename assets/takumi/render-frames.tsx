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
// Two kinds of animated scene:
//   · built-in  — "animate": "<name>" from assets/takumi/animate.tsx (18 keyframes)
//   · Earth/SVG — "animate": "<name>" registered in assets/svg/earth.tsx, drawn as
//                 a full-frame 1600x900 SVG scene that is pure function of t
//
// Output: <outdir>/000.png ... <outdir>/(n-1).png  (1080x1920 or 1920x1080 per --w/--h)

import { render } from "takumi-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderAnimated } from "./storyboard-templates.tsx";
import { renderSvgScene, isSvgScene } from "./render-svg-scene.tsx";

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

// args
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const specPath = arg("spec");
const outdir = arg("outdir", "frames");
const n = Number(arg("n", 18));
const W = Number(arg("w", 1920));
const H = Number(arg("h", 1080));

const spec = JSON.parse(await readFile(specPath, "utf8"));
await mkdir(outdir, { recursive: true });

// takumi wants font *data*, not a path — passing a path throws ERR_INVALID_URL
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

const svgScene = isSvgScene(spec.animate);
if (spec.animate && !svgScene && !renderAnimated(spec, 0, { w: W, h: H })) {
  console.error(`  ✗ unknown animation "${spec.animate}"`);
  process.exit(1);
}

for (let i = 0; i < n; i++) {
  const t = n === 1 ? 0 : i / (n - 1);
  const element = svgScene
    ? renderSvgScene(spec.animate, t, { w: W, h: H })
    : renderAnimated(spec, t, { w: W, h: H });
  const png = await render(element, { width: W, height: H, fonts });
  await writeFile(join(outdir, `${String(i).padStart(3, "0")}.png`), png);
}
