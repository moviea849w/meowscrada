// preview-earth.tsx — render every Earth scene at a few t values into a sheet.
//
//   node --experimental-strip-types scripts/preview-earth.tsx [t]
//
// Writes /tmp/opencode/earth-<name>-<t>.png for each scene. Cheaper than a
// render: this is the "check the stills before encoding" step.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createCanvas, loadImage } from "canvas";
import { writeFileSync, mkdirSync } from "node:fs";
import { EARTH_SCENES } from "../assets/svg/earth.tsx";

const t = Number(process.argv[2] ?? 0.6);
const only = process.argv[3];
const dir = "/tmp/opencode";
mkdirSync(dir, { recursive: true });

const canvas = createCanvas(1600, 900);
const ctx = canvas.getContext("2d");

for (const [name, scene] of Object.entries(EARTH_SCENES)) {
  if (only && !name.includes(only)) continue;
  const body = renderToStaticMarkup(
    createElement(
      "svg",
      { xmlns: "http://www.w3.org/2000/svg", width: 1600, height: 900, viewBox: "0 0 1600 900" },
      createElement("rect", { width: 1600, height: 900, fill: "#080d18" }),
      scene(t),
    ),
  );
  const img = await loadImage(`data:image/svg+xml;base64,${Buffer.from(body).toString("base64")}`);
  ctx.clearRect(0, 0, 1600, 900);
  ctx.drawImage(img, 0, 0, 1600, 900);
  const out = `${dir}/earth-${name}-${t}.png`;
  writeFileSync(out, canvas.toBuffer("image/png"));
  console.log(out);
}
