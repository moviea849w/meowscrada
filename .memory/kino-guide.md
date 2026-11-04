# Kino Guide

**Kino** (`@glitchoff/kino`) compiles declarative **JSON compositions** into MP4 via FFmpeg. No React, no browser — just JSON scenes.

> ⚠️ **Status: installed but not the main pipeline.** Kino draws positioned text and layers only — no rounded cards, borders, or icons — so its output looks plain next to the Takumi cards. We keep it installed for the "whole video as one JSON file" use case. Use `scripts/math-short.sh` for real videos.

## Install
```bash
npm install @glitchoff/kino --ignore-scripts
```
> ⚠️ **Use `--ignore-scripts`.** Kino's postinstall downloads its own FFmpeg from a pinned GitHub URL that currently **404s**. Skipping scripts installs the library fine; we point Kino at the system `ffmpeg` instead.

## Render with system ffmpeg
```bash
FFMPEG_PATH="$(command -v ffmpeg)" \
  node node_modules/@glitchoff/kino/dist/cli.js scene.json -o out.mp4 --encoder libx264
```
- `--encoder libx264` = CPU (reliable here; no GPU)
- `--encoder auto` = probes for NVENC/QSV/VAAPI, falls back to CPU

## Quick test
```bash
./scripts/kino-math.sh 12 15
```

## Composition shape
```json
{
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "scenes": [
    {
      "duration": 9,
      "background": "#111318",
      "elements": [
        { "type": "text", "content": "12 + 15 = ?", "fontSize": 124,
          "fontColor": "#f2f3f5", "x": "center", "y": 420,
          "startAt": 0, "duration": 9 }
      ]
    }
  ]
}
```
- **Composition** has `width`, `height`, `fps`, `scenes[]`
- **Scenes** play sequentially, own duration + background
- **Elements** (text / image / html / video) are layers, `startAt` relative to the scene
- 11 built-in transitions via `xfade`

## Studio (visual editor)
```bash
npx kino studio --port 3333   # needs the bundled ffmpeg; may fail here
```
Use the CLI instead if studio's ffmpeg check fails.

## Gotchas
- Element types include `html`, which needs a browser — Kino downloads Chrome lazily. Avoid `html` elements on this machine.
- Fonts: `fontFile` accepts local paths or URLs (downloaded at compile time).
- Text is positioned by `x`/`y` as a top-left-ish anchor with `"center"` support — verify visually, don't trust absolute pixel guesses.

## Kino vs Takumi vs ffmpeg

| Tool | Best for | Output |
|---|---|---|
| **Takumi** | pixel-perfect cards/UI with flexbox, fonts, SVG | PNG (then ffmpeg animates) |
| **Kino** | whole videos as JSON scenes, text, transitions, audio | MP4 directly |
| **ffmpeg** | animation, mixing, trimming, overlays | MP4 |

**Recommendation:** Takumi for the *look* of cards, ffmpeg for *motion* and audio (that's `scripts/math-short.sh`). Use Kino when you want a whole video declared in one JSON file, or for rapid scene iteration.

## Files
| File | Purpose |
|---|---|
| `scripts/kino-math.sh` | Hindi math quiz short, built as a Kino JSON composition |
| `.temp/kino-math-*.json` | generated composition (inspect/edit) |
| `.temp/kino-math-*.mp4` | rendered video |
