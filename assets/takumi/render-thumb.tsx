// render-thumb.tsx — YouTube thumbnail (1280x720) for a long-form episode.
//
// Thumbnails follow different rules from scene cards: they are seen at ~320px wide,
// so the text must be huge, high contrast, and readable at a glance. One face, one
// short phrase, one accent.
//
// Usage:
//   node .temp/render-thumb.mjs --spec thumb.json --out thumb.png
//
// thumb.json:
//   { "art": "assets/art/001-medieval-king/richard-portrait.jpg",
//     "focus": "top",
//     "line1": "Being a king",
//     "line2": "was DANGEROUS",
//     "accentWord": "DANGEROUS",
//     "badge": "1381" }

import { render } from "takumi-js";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };

const spec = JSON.parse(await readFile(arg("spec", "thumb.json"), "utf8"));
const OUT = arg("out", "thumb.png");

const W = 1280, H = 720;

const font = async (file, weight) => ({
  name: "Poppins",
  data: await readFile(join(FONT_DIR, file)),
  weight,
  style: "normal",
});
const fonts = [
  await font("Poppins-Bold.ttf", 700),
  await font("Poppins-ExtraBold.ttf", 800),
];

let art = null;
if (spec.art) {
  try {
    const buf = await readFile(join(ROOT, spec.art));
    art = `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    console.error(`! missing art: ${spec.art}`);
  }
}

const pos =
  spec.focus === "top" ? "center 10%" :
  spec.focus === "left" ? "15% center" :
  "center center";

// Split a line so the accent word renders in gold. Spaces are preserved
// explicitly: split() drops them, which glued "was" + "DANGEROUS" together.
const Line = ({ text, accent, size }) => {
  const idx = accent ? text.indexOf(accent) : -1;
  if (!accent || idx < 0) {
    return (
      <div style={{ display: "flex", fontSize: size, fontWeight: 800, color: "#ffffff", lineHeight: 1.02 }}>
        {text}
      </div>
    );
  }
  const before = text.slice(0, idx);
  const after = text.slice(idx + accent.length);
  return (
    <div style={{ display: "flex", fontSize: size, fontWeight: 800, color: "#ffffff", lineHeight: 1.02 }}>
      {before ? <div style={{ display: "flex", whiteSpace: "pre" }}>{before}</div> : null}
      <div style={{ display: "flex", color: "#e8b44a" }}>{accent}</div>
      {after ? <div style={{ display: "flex", whiteSpace: "pre" }}>{after}</div> : null}
    </div>
  );
};

const node = (
  <div
    style={{
      display: "flex",
      position: "relative",
      width: W,
      height: H,
      background: "#0b0a09",
      fontFamily: "Poppins",
      overflow: "hidden",
    }}
  >
    {art ? (
      <img
        src={art}
        style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", objectPosition: pos }}
      />
    ) : null}

    {/* left-side scrim so text never fights the art */}
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        background:
          "linear-gradient(to right, rgba(8,7,6,0.97) 0%, rgba(8,7,6,0.88) 38%, rgba(8,7,6,0.25) 68%, rgba(8,7,6,0.55) 100%)",
      }}
    />

    {spec.badge ? (
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 64,
          top: 52,
          paddingLeft: 22,
          paddingRight: 22,
          paddingTop: 8,
          paddingBottom: 8,
          background: "#e8b44a",
          color: "#0b0a09",
          fontSize: 30,
          fontWeight: 800,
          borderRadius: 8,
        }}
      >
        {spec.badge}
      </div>
    ) : null}

    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 64,
        top: 0,
        width: 760,
        height: H,
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <Line text={spec.line1} accent={spec.accentWord} size={spec.size1 || 92} />
      <Line text={spec.line2} accent={spec.accentWord} size={spec.size2 || 92} />
    </div>

    {/* bottom rule + handle */}
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 64,
        bottom: 44,
        width: 70,
        height: 6,
        background: "#e8b44a",
      }}
    />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 150,
        bottom: 32,
        fontSize: 30,
        fontWeight: 700,
        color: "#b9b3a5",
      }}
    >
      @meowscrada
    </div>
  </div>
);

const png = await render(node, { width: W, height: H, format: "png", fonts });
await writeFile(OUT, png);
console.log(`✓ ${OUT}`);
