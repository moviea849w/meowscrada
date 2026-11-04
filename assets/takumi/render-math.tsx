// render-math.tsx — render a math quiz card to PNG with Takumi (no headless browser)
//
// Usage:
//   node assets/takumi/render-math.tsx --a 12 --b 15 --state question --out card.png
//   node assets/takumi/render-math.tsx --a 12 --b 15 --state answer   --out card.png
//
// States:
//   question — equation + 4 options, timer, progress bar
//   answer   — options with the correct one highlighted, answer reveal

import { render } from "takumi-js";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// repo root — works whether run directly or bundled into .temp/
const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = HERE.includes("/.temp") ? join(HERE, "..", "assets", "fonts") : join(HERE, "..", "fonts");

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const A = Number(arg("a", 12));
const B = Number(arg("b", 15));
const STATE = arg("state", "question");
const OUT = arg("out", "card.png");
const ANSWER = A + B;

// options: correct + 3 distractors, shuffled deterministically per problem
const pool = [ANSWER, ANSWER + 3, ANSWER - 2, ANSWER + 10];
const seed = (A * 31 + B * 17) % 4;
const options = [...pool.slice(seed), ...pool.slice(0, seed)];
const letters = ["A", "B", "C", "D"];

const isAnswer = STATE === "answer";

const font = async (file) => ({
  name: "Poppins",
  data: await readFile(join(FONT_DIR, file)),
  weight: 700,
  style: "normal",
});
const bold = await font("Poppins-Bold.ttf");
const extra = await font("Poppins-ExtraBold.ttf");

// ---------- tiny SVG icon set (inline data URIs) ----------
const svgUri = (svg) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const clockIcon = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e8b44a" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
);
const checkIcon = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00d68f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l5 5L20 6"/></svg>`,
);
const brainIcon = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e8b44a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V3z"/><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V3z"/></svg>`,
);

// ---------- styles ----------
// Unslop pass: one neutral surface ramp, a single accent (amber) used sparingly,
// sentence-case copy, hairline borders, no gradients or glows.
const C = {
  bg: "#111318",        // page
  surface: "#191c23",   // raised card
  surfaceDim: "#15181e",// dimmed option after reveal
  line: "rgba(255,255,255,0.07)",
  text: "#f2f3f5",
  textDim: "#9aa0ab",
  accent: "#e8b44a",    // used for the timer + progress only
  ok: "#3fbf8f",
  okInk: "#08221a",
};

const optionStyle = (i) => {
  const correct = options[i] === ANSWER;
  if (!isAnswer) {
    return {
      background: C.surface,
      border: `1.5px solid ${C.line}`,
      color: C.text,
      badge: "rgba(255,255,255,0.06)",
      badgeInk: C.textDim,
    };
  }
  return correct
    ? {
        background: C.ok,
        border: `1.5px solid ${C.ok}`,
        color: C.okInk,
        badge: "rgba(0,0,0,0.14)",
        badgeInk: C.okInk,
      }
    : {
        background: C.surfaceDim,
        border: `1.5px solid rgba(255,255,255,0.04)`,
        color: C.textDim,
        badge: "rgba(255,255,255,0.04)",
        badgeInk: "#6b7280",
      };
};

const Options = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 40 }}>
    {options.map((value, i) => {
      const s = optionStyle(i);
      const correct = options[i] === ANSWER;
      return (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 30,
            height: 140,
            paddingLeft: 32,
            paddingRight: 34,
            borderRadius: 28,
            background: s.background,
            border: s.border,
            color: s.color,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 74,
              height: 74,
              borderRadius: 20,
              background: s.badge,
              color: s.badgeInk,
              fontSize: 34,
            }}
          >
            {letters[i]}
          </div>
          <div style={{ fontSize: 62 }}>{String(value)}</div>
          {isAnswer && correct ? (
            <img src={checkIcon} style={{ width: 52, height: 52, marginLeft: "auto" }} />
          ) : null}
        </div>
      );
    })}
  </div>
);

const card = (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: 1080,
      height: 1920,
      padding: 64,
      background: C.bg,
      color: C.text,
      fontFamily: "Poppins",
    }}
  >
    {/* header */}
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <img src={brainIcon} style={{ width: 54, height: 54 }} />
      <div style={{ fontSize: 40, color: C.text, letterSpacing: 0 }}>Math quiz</div>
    </div>

    {/* equation card */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 48,
        height: 280,
        borderRadius: 28,
        background: C.surface,
        border: `1.5px solid ${C.line}`,
      }}
    >
      <div style={{ fontSize: 124, letterSpacing: 0 }}>
        {A} + {B} = ?
      </div>
    </div>

    <Options />

    {/* bottom: timer or answer */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "auto",
        paddingBottom: 8,
      }}
    >
      {isAnswer ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 38, color: C.textDim }}>Answer</div>
          <div style={{ fontSize: 148, color: C.ok }}>{String(ANSWER)}</div>
        </div>
      ) : (
        <div style={{ display: "flex", height: 96 }} />
      )}

      {/* progress bar */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 18,
          marginTop: 30,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: isAnswer ? "100%" : "35%",
            height: 18,
            borderRadius: 999,
            background: isAnswer ? C.ok : C.accent,
          }}
        />
      </div>

      <div style={{ marginTop: 24, fontSize: 32, color: C.textDim }}>@meowscrada</div>
    </div>
  </div>
);

const png = await render(card, {
  width: 1080,
  height: 1920,
  format: "png",
  fonts: [bold, extra],
});

await writeFile(OUT, png);
console.log(`✓ ${OUT}`);
