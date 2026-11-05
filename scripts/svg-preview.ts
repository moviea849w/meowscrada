// Preview helper: import a TS module, hand its SVG string to a callback.
// Usage: node --experimental-strip-types scripts/svg-preview.ts <module.ts> <exportName> out.png
//
// Exists because `canvas` resolves from the repo's node_modules, and a script
// living in /tmp cannot see them. Renders at 1600x900.

import { createCanvas, loadImage } from "canvas";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [modPath, exportName, outPath] = process.argv.slice(2);
if (!modPath || !exportName || !outPath) {
  console.error("usage: svg-preview.ts <module.ts> <exportName> <out.png>");
  process.exit(1);
}

const mod: Record<string, any> = await import(resolve(modPath));
const draw: any = mod[exportName];
if (!draw) {
  console.error(`no export ${exportName} in ${modPath}`);
  process.exit(1);
}

// A scene can be: an SVG string, or a function (t) => SVG string.
const body: string = typeof draw === "function" ? draw(Number(process.env.T ?? 0.6)) : draw;
const svg = body.trim().startsWith("<svg")
  ? body
  : `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">${body}</svg>`;

const img = await loadImage(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
const canvas = createCanvas(1600, 900);
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0, 1600, 900);
writeFileSync(outPath, canvas.toBuffer("image/png"));
console.log(`${outPath}  (${svg.length} bytes of SVG)`);
