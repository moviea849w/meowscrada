---
name: roughjs
description: Draw hand-drawn sketch annotations (circles, arrows, underlines, brackets, hatching) with Rough.js and node-canvas, composited over episode stills. Load when a scene needs a hand-drawn mark, a doodle looks wrong, or a new mark type is needed.
---

# Rough.js Skill — hand-drawn annotations

Sketchy marks rendered to a **transparent PNG** with `roughjs` + the `canvas` package.
No browser, no GPU — instant. Then composited over a Takumi still **before** Ken Burns,
so the marks move with the art.

Renderer: `assets/takumi/render-doodles.mjs`
Wired into the pipeline: `scripts/pipeline.sh` (step `still`) and `scripts/longform.sh`.

## Usage

```bash
node assets/takumi/render-doodles.mjs --spec doodles.json --out overlay.png
```

`doodles.json`:
```json
{ "width": 1920, "height": 1080, "color": "#c8452a", "seed": 7,
  "marks": [
    { "type": "circle",    "x": 900,  "y": 400, "w": 320, "h": 240 },
    { "type": "arrow",     "from": [400, 800], "to": [880, 430] },
    { "type": "underline", "x": 200,  "y": 900, "w": 600 },
    { "type": "box",       "x": 100,  "y": 700, "w": 500, "h": 200 },
    { "type": "bracket",   "x": 1400, "y": 300, "h": 400, "side": "left" },
    { "type": "cross",     "x": 300,  "y": 300, "size": 90 },
    { "type": "hatch",     "x": 100,  "y": 100, "w": 300, "h": 200 },
    { "type": "text",      "x": 300,  "y": 200, "text": "1399", "size": 64 }
  ] }
```

In an episode, put the marks straight in `scenes.json` — the pipeline builds the spec:
```json
"doodles": [ { "type": "circle", "x": 960, "y": 520, "w": 1560, "h": 300 } ]
```

## Mark types

| Type | Fields | Notes |
|---|---|---|
| `circle` | `x y w h` | draws two loose passes — reads as a pencil going round twice |
| `box` | `x y w h` | rectangle |
| `underline` | `x y w`, `dy` | `dy` tilts the line |
| `arrow` | `from [x,y]`, `to [x,y]`, `head` | head is two short strokes, default 34 |
| `bracket` | `x y h`, `side`, `hook` | `side: "left"` (default) or `"right"` |
| `cross` | `x y size` | an X |
| `hatch` | `x y w h`, `fillStyle`, `gap` | hachure fill |
| `text` | `x y text size align` | Poppins 800; keep English only |

Shared per-mark overrides: `color`, `strokeWidth`, `roughness`, `seed`.

## Rules

- **Sparse.** 4 of 20 scenes in episode 1. Annotating every frame reads as decoration.
- **Coordinates are in the 1920x1080 still**, not the video frame.
- **Mind the layout.** On the `split` template the art sits on the right half — marks on
  the left land on the black panel and vanish.
- **Colour is set by the pipeline**, not the scene (`#c8452a` in `pipeline.sh`). A scene
  `color` field is ignored unless you change the pipeline.

## Gotchas

- **Rough.js v4 has no `rc.seed()`.** Randomness is a **per-shape `seed` option**. The
  renderer derives a stable seed per mark (`BASE_SEED * 1000 + i * 37`) so renders are
  reproducible but marks don't look copy-pasted.
- **Poppins has no arrow glyphs.** `→` and `↓` render as tofu. Draw arrows as `arrow`
  marks, or use words.
- `node-canvas` needs no display; if `canvas` fails to load it is a native-build problem,
  not a rendering problem — reinstall the package.
