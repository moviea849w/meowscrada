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

## Rendering
`scripts/longform.sh <slug>` builds each scene as a short video clip (zoompan + text overlay), then concatenates with crossfades and lays the narration underneath.

Why clip-per-scene: it keeps memory flat for an 8-minute video, lets you re-render one scene, and makes timing changes cheap.

## Gotchas
- `zoompan` needs `d=<frames>` and an `s=` output size; it silently crops if you forget `scale` first.
- Long xfade chains must be chained pairwise — a single filter with 80 inputs will blow up.
- Drawtext with a Devanagari font breaks on Latin glyphs — use Poppins for on-screen text (English only).
- Piper is fast but flat; keep sentences short so it doesn't drag.
