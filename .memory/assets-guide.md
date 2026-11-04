# Asset Library

Everything reusable lives in `assets/` and **is committed to git**. Episodes reference assets by key, never by hardcoded path, so assets can be swapped without touching scripts.

```
assets/
  art/<slug>/            episode artwork + credits.json
  music/                 background music + credits.json
  sfx/                   sound effects + credits.json
  backgrounds/           generated texture plates (we own these)
  fonts/                 Poppins, Fredoka, Baloo2
  takumi/                scene renderers and templates
```

## License policy

The channel is monetised, so we only ship **CC0, CC-BY, CC-BY-SA, or public domain**.

| Allowed | Rejected |
|---|---|
| CC0, Public domain | CC-BY-NC (non-commercial) |
| CC-BY, CC-BY-SA | CC-BY-ND (no derivatives — we cut and remix) |

Every folder has a `credits.json` with title, creator, license and source URL. **Paste the relevant lines into the YouTube description.** Both fetch scripts enforce this and refuse anything else.

## Artwork — `scripts/art-fetch.sh`

Sources: Wikimedia Commons + Wikipedia APIs (no key needed).

```bash
./scripts/art-fetch.sh episodes/001-medieval-king/art.json assets/art/001-medieval-king
```

Four lookup modes, best for history first:

| Mode | Use it for | Example |
|---|---|---|
| `file` | you know the exact Commons file | `"file": "File:DeathWatTylerFull.jpg"` |
| `category` | browse a Commons category | `"category": "Category:Tower of London"` |
| `wiki` | the lead image of a Wikipedia article | `"wiki": "Richard II of England"` |
| `search` | last resort (often modern photos) | `"search": "Black Death miniature"` |

Tips learned the hard way:
- **Prefer `file`** for historical topics. `search` returns tourist photos and coins.
- Aim for **≥1200px wide**. Anything smaller looks soft at 1080p.
- Avoid images with **visible modern elements** (tourists, buses) — they break the illusion.
- Don't reuse the same file for two keys unless you also vary `focus` and `motion`.

## Music — `scripts/audio-fetch.sh music`

Sources: Openverse API (indexes Freesound, Jamendo, Wikimedia). No key needed.

```bash
./scripts/audio-fetch.sh music assets/music/music.json assets/music
```

```json
[{ "key": "medieval-ambient", "query": "medieval ambient music", "minDuration": 45 }]
```

- `minDuration` / `maxDuration` are **seconds** (Openverse reports ms internally; the script converts).
- Music is loudness-normalized to −20 LUFS so tracks sit evenly under narration.
- Freesound previews are often short — set `minDuration` low or you get nothing.

## SFX — `scripts/audio-fetch.sh sfx`

```bash
./scripts/audio-fetch.sh sfx assets/sfx/sfx.json assets/sfx
```

- Normalized to −16 LUFS (SFX should sit above music, below voice).
- Keep SFX under ~8s. Long "sfx" results are usually music.

## Backgrounds — `assets/takumi/render-bg.tsx`

Generated locally, so no licensing at all.

```bash
npx esbuild assets/takumi/render-bg.tsx --bundle --platform=node --format=esm \
  --external:takumi-js --jsx=automatic --outfile=.temp/render-bg.mjs --loader:.tsx=tsx
node .temp/render-bg.mjs --kind parchment --out assets/backgrounds/bg-parchment.png
```

Kinds: `paper`, `ink`, `parchment`, `grid`. Use them for title/quote scenes with no artwork.

## Growing the library

1. Add entries to `assets/music/music.json` or `assets/sfx/sfx.json` (one line each).
2. Run the fetch script — it appends to `credits.json` and skips nothing that already exists by key.
3. Commit both the audio and `credits.json`.

For artwork, keep it per-episode in `assets/art/<slug>/`. If an image will be reused across episodes, move it to `assets/art/shared/`.
