// render-scene.tsx — render one long-form scene still to PNG with Takumi.
//
// Layouts live in scene-templates.tsx; this file only loads data and calls one.
// ffmpeg then adds Ken Burns motion and crossfades scenes together.
//
// Usage:
//   node .temp/render-scene.mjs --spec scene.json --out scene.png
//
// scene.json (see scene-templates.tsx for the full shape):
//   { "template": "lower-third", "art": "assets/art/.../x.jpg",
//     "kicker": "Act one", "title": "Land was everything", "sub": "...",
//     "focus": "top", "scrim": 0.28, "titleSize": 88 }

import { render } from "takumi-js";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { renderTemplate } from "./scene-templates.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

// find the repo root by walking up until package.json + assets/fonts both exist,
// so the bundle works from anywhere (.temp/, .temp/<slug>/, or assets/takumi/)
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

const spec = JSON.parse(await readFile(arg("spec", "scene.json"), "utf8"));
const OUT = arg("out", "scene.png");

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

let art = null;
if (spec.art) {
  try {
    const buf = await readFile(resolve(ROOT, spec.art));
    art = `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    console.error(`! missing art: ${spec.art}`);
  }
}

const C = {
  text: "#f5f2ea",
  textDim: "#b9b3a5",
  accent: "#d8a54a",
  ink: "#0b0a09",
  surface: "#141210",
};

const node = renderTemplate(spec, art, C);

const png = await render(node, { width: 1920, height: 1080, format: "png", fonts });
await writeFile(OUT, png);
console.log(`✓ ${OUT}`);
