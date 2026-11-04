# Obscura Background Guide

Render a webpage as a rasterized PNG background for short videos, using the local **Obscura** headless browser.

## What it does
`scripts/bg-render.sh` loads a URL in Obscura, takes a screenshot, scales/crops it to **1080x1920** (vertical), and optionally darkens it so text overlays stay readable.

## Usage
```bash
./scripts/bg-render.sh https://example.com
./scripts/bg-render.sh https://example.com --size 1080x1920
./scripts/bg-render.sh https://example.com --wait 3
./scripts/bg-render.sh https://example.com --out .temp/my-bg.png
./scripts/bg-render.sh https://example.com --dark     # darken for overlays
```

Output goes to `.temp/bg-<timestamp>.png` by default (gitignored).

## Using the PNG in a video
```bash
ffmpeg -loop 1 -i .temp/bg-XXXX.png -i voice.wav \
  -vf "scale=1080:1920" -c:v libx264 -pix_fmt yuv420p \
  -c:a aac -t 12 -shortest out.mp4
```

Slow pan/zoom (Ken Burns):
```bash
ffmpeg -loop 1 -i bg.png -i voice.wav -t 12 \
  -vf "scale=1620:2880,zoompan=z='min(zoom+0.0005,1.2)':d=360:s=1080x1920" \
  -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest out.mp4
```

## Notes / gotchas
- Obscura screenshot = **viewport size**; the script scales + center-crops to 1080x1920.
- Screenshot flag is `obscura fetch URL --screenshot FILE` (there is no `screenshot` subcommand).
- `--wait N` lets JS-heavy pages settle before capture.
- Local/private URLs are blocked by default; add `--allow-private-network` to the obscura call for localhost.
- Some sites block headless browsers; use `--stealth` if needed.
- Respect site terms/robots when capturing pages.

## Obscura binary
- Local: `./obscura` (v0.2.6) and `./obscura-worker` in the repo root (gitignored)
- Re-download: `curl -LO https://github.com/h4ckf0r0day/obscura/releases/latest/download/obscura-x86_64-linux.tar.gz`
