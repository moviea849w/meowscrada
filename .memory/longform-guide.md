# Long-Form Guide — curiosity explainer videos

How we make 5–8 minute 16:9 episodes with historic artwork, Hindi narration and English on-screen text.

## The shape of an episode

| Beat | Length | What it does |
|---|---|---|
| **Cold open** | 0:00–0:20 | The question, stated plainly, over the strongest image. No logo, no intro. |
| **Stakes** | 0:20–1:00 | Why the answer is not obvious / what's at risk. |
| **Act 1** | 1:00–3:00 | First part of the story. |
| **Turn** | 3:00–4:00 | The twist — the thing the viewer didn't expect. |
| **Act 2** | 4:00–6:30 | Consequence, detail, the mechanism. |
| **Payoff** | 6:30–7:30 | Answer the title question directly. |
| **New question** | 7:30–8:00 | Tease the next episode. |

Rule: every 20–30 seconds there is a **new visual** and a **new idea**. Never two minutes of one still.

## Pipeline

```
idea
 → research (Exa + Wikipedia)
 → script (episodes/<slug>/script.md — Hindi narration + English on-screen lines)
 → art list (episodes/<slug>/art.json — Wikimedia queries or direct files)
 → art fetch (scripts/art-fetch.sh → assets/art/<slug>/)
 → voice (scripts/tts, one WAV per scene)
 → scenes (episodes/<slug>/scenes.json — image, duration, motion, overlay text)
 → render (scripts/longform.sh → MP4)
 → thumbnails + shorts (scripts/shorts-from-long.sh)
```

## Script format

`episodes/<slug>/script.md` holds the narration, one block per scene:

```markdown
## scene 01 — cold open
ART: richard-ii-coronation
TEXT: Why was being a king dangerous?
SAY: एक राजा के पास सब कुछ था...
```

- `SAY:` is **Hindi** and is what the voice reads. Never technical English.
- `TEXT:` is **English** and is what appears on screen. 3–8 words.
- `ART:` is a key from `art.json`.

## Art rules
- Public domain only (Wikimedia Commons). Prefer paintings, engravings, manuscript miniatures.
- Minimum 1200px on the short side; fetch at 1920 wide.
- Credit the file + author in `art.json` → shown in the video description.
- Every image gets slow **Ken Burns** motion (zoom 1.0 → 1.12, or pan). Static frames look dead.
- Darken edges with a vignette so white text stays readable.

## Scene templates

Layouts live in `assets/takumi/scene-templates.tsx` as pure functions `(scene, art, palette) → JSX`.
`assets/takumi/render-scene.tsx` just loads data and calls one, so a single edit fixes every video.

| Template | Use for |
|---|---|
| `title` | cold open, outro |
| `lower-third` | the workhorse — kicker + headline, bottom-left |
| `quote` | the turn / a big statement, centered |
| `stat` | one huge number (`"stat": "1381"`) |
| `split` | art right, solid panel left holding text |

**Vary templates between episodes.** In episode 1 the rotation is `title, stat, quote, lower-third, split, lower-third, quote, quote, split, …` — no two adjacent scenes share a layout.

## Hand-drawn annotations (Rough.js)

`assets/takumi/render-doodles.mjs` draws sketchy marks to a **transparent PNG** using the
`canvas` package — no headless browser. They suit history content because the source art
(manuscripts, woodcuts) is itself hand-drawn, so annotation reads as a person explaining.

```json
"doodles": [
  { "type": "circle", "x": 300, "y": 760, "w": 230, "h": 190 },
  { "type": "arrow", "from": [720, 980], "to": [420, 840] }
]
```

Mark types: `circle`, `arrow`, `underline`, `box`, `bracket`, `cross`, `hatch`, `text`.

Rules:
- **Sparse.** 4 of 20 scenes in episode 1. Annotating every frame looks like decoration.
- Composite happens **before** Ken Burns, so the marks move with the art.
- Coordinates are in the 1920x1080 still, not the video frame.

Rough.js v4 gotcha: there is no `rc.seed()` method. Randomness is a **per-shape `seed` option**.

## Rendering
`scripts/longform.sh <slug>` builds each scene as a short video clip (zoompan + text overlay), then concatenates with crossfades and lays the narration underneath.

Why clip-per-scene: it keeps memory flat for an 8-minute video, lets you re-render one scene, and makes timing changes cheap.

## Gotchas
- `zoompan` needs `d=<frames>` and an `s=` output size; it silently crops if you forget `scale` first.
- Long xfade chains must be chained pairwise — a single filter with 80 inputs will blow up.
- **Never use `xfade=transition=fade` between text-heavy frames** — two headlines overlap and
  both stay readable. Use `fadeblack` so only one headline is legible at a time.
- Mix narration with `alimiter` at the end. `amix` with `normalize=0` clips at 0.0 dB.
- Drawtext with a Devanagari font breaks on Latin glyphs — use Poppins for on-screen text (English only).
- Piper is fast but flat; keep sentences short so it doesn't drag.
- The renderer bundle sits at `.temp/<slug>/`, two levels deep — resolve the repo root by
  **walking up until `package.json` + `assets/fonts` both exist**, not by counting `..`.
- `art-fetch.sh` skips files that already exist. Set `FORCE_REFETCH=1` to re-download.
