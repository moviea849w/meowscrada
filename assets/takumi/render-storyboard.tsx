// render-storyboard.tsx — render one storyboard panel to a vertical PNG.
//
// Same contract as render-scene.tsx, but for 1080x1920 storyboard explainers.
// Layouts live in storyboard-templates.tsx.
//
// Usage:
//   node .temp/<slug>/render-storyboard.mjs --spec panel.json --out panel.png
//
// panel.json:
//   { "template": "sketch", "draw": "headphone", "kicker": "THE PROBLEM",
//     "text": "Noise-cancelling headphones\ndon't block sound.",
//     "accent": "don't block sound.", "sub": "...", "panel": "1" }

import { render } from "takumi-js";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderTemplate } from "./storyboard-templates.tsx";

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

const spec = JSON.parse(await readFile(arg("spec", "panel.json"), "utf8"));
const OUT = arg("out", "panel.png");

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

// paper + ink palette for the storyboard look
const C = {
  paper: "#f4ede1",
  ink: "#1d1a16",
  inkDim: "#6f6659",
  accent: "#c8452a",
  accentSoft: "#e8a08f",
};

const node = renderTemplate(spec, C);
const png = await render(node, { width: 1080, height: 1920, format: "png", fonts });
await writeFile(OUT, png);
console.log(`✓ ${OUT}`);
