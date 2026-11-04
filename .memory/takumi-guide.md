# Takumi Guide — card rendering

Takumi (Rust, by kane50613) lays out JSX/HTML with CSS and rasterizes to PNG **without a headless browser**. We use it to draw the quiz cards (equation, options, answer) at full quality, then ffmpeg animates them into video.

## Why Takumi over ffmpeg drawtext
- Real layout: flexbox, rounded cards, padding, borders, gradients
- Any font (Poppins), any size, crisp glyphs — no clipping maths
- SVG icons as inline data URIs
- No browser, so it's fast and light

## Install
```bash
npm install takumi-js react
npm install -D esbuild
```

## Render a card
```bash
npx esbuild assets/takumi/render-math.tsx \
  --bundle --platform=node --format=esm --external:takumi-js --jsx=automatic \
  --outfile=.temp/render-math.mjs --loader:.tsx=tsx

node .temp/render-math.mjs --a 12 --b 15 --state question --out .temp/card-q.png
node .temp/render-math.mjs --a 12 --b 15 --state answer   --out .temp/card-a.png
```

`scripts/math-short.sh` does this automatically.

## Gotchas
- **Node cannot run `.tsx` directly** — bundle with esbuild first (JSX automatic).
- **Takumi loads no system fonts.** Pass fonts explicitly via the `fonts` option, or glyphs render as tofu.
- Font files must be read as `Buffer` from disk (`assets/fonts/`).
- When bundling into `.temp/`, resolve font paths from the repo root (handled in the script).

## Assets
| File | Use |
|---|---|
| `assets/fonts/Poppins-Bold.ttf` | body |
| `assets/fonts/Poppins-ExtraBold.ttf` | equation, numbers |
| `assets/fonts/Fredoka-Bold.ttf` | playful titles |
| `assets/fonts/Baloo2-ExtraBold.ttf` | rounded headings |

Icons are inline SVG data URIs inside `render-math.tsx` (clock, check, brain).

## Design rules (unslop)
The cards follow `.opencode/skills/unslop`:
- One neutral surface ramp, one accent (amber) used once or twice
- No gradients on chrome, no glows, hairline borders
- Sentence-case labels ("Math quiz", "Answer"), not SHOUTY TRACKED CAPS
- Weight 700–800 only for the numbers; hierarchy from size
- One icon set, one stroke, one color role
