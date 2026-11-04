// render-overlay.tsx — a transparent text layer to sit over stock footage.
//
// Footage scenes are real video; they still need the headline. This renders ONLY
// the type and scrim to a transparent PNG, which the clip step composites over
// the moving footage. The text stays perfectly still while the video moves behind
// it, which is what makes a title read as a title rather than as part of the shot.
//
// Usage:
//   node .temp/<slug>/render-overlay.mjs --spec overlay.json --out overlay.png

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

const spec = JSON.parse(await readFile(arg("spec", "overlay.json"), "utf8"));
const OUT = arg("out", "overlay.png");
const W = parseInt(arg("w", "1920"), 10);
const H = parseInt(arg("h", "1080"), 10);

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

const C = { text: "#f7f4ec", dim: "#c9c2b3", accent: "#d8a54a" };

const parts = (spec.text ?? "").split("\n");
const accent = spec.accent;

const node = (
  <div style={{ display: "flex", position: "relative", width: W, height: H, fontFamily: "Poppins" }}>
    {/* scrim: dark at the bottom so type is readable over any footage */}
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        background:
          "linear-gradient(to top, rgba(6,6,8,0.94) 0%, rgba(6,6,8,0.72) 30%, rgba(6,6,8,0.15) 62%, rgba(6,6,8,0.35) 100%)",
      }}
    />
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 120,
        top: 0,
        width: W - 260,
        height: H,
        flexDirection: "column",
        justifyContent: "flex-end",
        paddingBottom: 110,
        gap: 22,
      }}
    >
      {spec.kicker ? (
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: C.accent }}>
          <div style={{ display: "flex", width: 48, height: 3, background: C.accent }} />
          <div style={{ display: "flex", letterSpacing: 3 }}>{spec.kicker}</div>
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {parts.map((line, i) => {
          const has = accent && line.includes(accent);
          const at = has ? line.indexOf(accent) : -1;
          const before = has ? line.slice(0, at) : line;
          const after = has ? line.slice(at + accent.length) : "";
          return (
            <div
              key={i}
              style={{ display: "flex", flexDirection: "row", fontSize: 84, fontWeight: 800, color: C.text, lineHeight: 1.1 }}
            >
              {has ? (
                <>
                  <div style={{ display: "flex" }}>{before}</div>
                  <div style={{ display: "flex", color: C.accent }}>{accent}</div>
                  <div style={{ display: "flex" }}>{after}</div>
                </>
              ) : (
                <div style={{ display: "flex" }}>{line || " "}</div>
              )}
            </div>
          );
        })}
      </div>
      {spec.sub ? (
        <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: C.dim }}>{spec.sub}</div>
      ) : null}
    </div>
  </div>
);

const png = await render(node, { width: W, height: H, format: "png", fonts });
await writeFile(OUT, png);
console.log(`✓ ${OUT}`);
