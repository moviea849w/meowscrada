// dump-scene.tsx — print the SVG markup one scene produces at one t.
// Debug helper: when a scene renders blank, this shows what was actually emitted.
//
//   npx esbuild scripts/dump-scene.tsx --bundle --platform=node --format=esm \
//     --jsx=automatic --external:react --external:react-dom \
//     --outfile=.temp/dev/dump.mjs --loader:.tsx=tsx
//   node .temp/dev/dump.mjs earth-brake 0.6

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EARTH_SCENES } from "../assets/svg/earth.tsx";

const [name = "earth-brake", tArg = "0.6"] = process.argv.slice(2);
const scene = EARTH_SCENES[name];
if (!scene) {
  console.error(`no scene ${name}. have: ${Object.keys(EARTH_SCENES).join(", ")}`);
  process.exit(1);
}
const html = renderToStaticMarkup(createElement("svg", {}, scene(Number(tArg))));
console.log(html.length, "bytes");
console.log(html.slice(0, Number(process.env.N ?? 2000)));
