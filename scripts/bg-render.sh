#!/usr/bin/env bash
# bg-render.sh — render a webpage as a rasterized PNG background (vertical short)
# using the local Obscura headless browser.
#
# Usage:
#   ./scripts/bg-render.sh URL                       # 1080x1920 PNG
#   ./scripts/bg-render.sh URL --size 1080x1920
#   ./scripts/bg-render.sh URL --wait 3 --out .temp/bg.png
#   ./scripts/bg-render.sh URL --dark                # dark background (for text overlays)
#
# Output: .temp/bg-<timestamp>.png
#
# Then use it as a video background:
#   ffmpeg -loop 1 -i bg.png -i voice.wav -vf "scale=1080:1920" -shortest out.mp4

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/.temp"
mkdir -p "$OUT_DIR"

OBSCURA="$ROOT/obscura"
[[ -x "$OBSCURA" ]] || OBSCURA="$(command -v obscura || true)"
[[ -n "$OBSCURA" ]] || { echo "✗ obscura binary not found (see .memory/obscura-guide.md)" >&2; exit 1; }

SIZE="1080x1920"
WAIT=2
OUT=""
DARK=0
URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --size) SIZE="$2"; shift 2 ;;
    --wait) WAIT="$2"; shift 2 ;;
    --out)  OUT="$2";  shift 2 ;;
    --dark) DARK=1; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) URL="$1"; shift ;;
  esac
done

[[ -n "$URL" ]] || { echo "✗ usage: $(basename "$0") URL [--size WxH] [--wait S] [--out FILE] [--dark]" >&2; exit 2; }
[[ -n "$OUT" ]] || OUT="$OUT_DIR/bg-$(date +%Y%m%d-%H%M%S).png"

W="${SIZE%x*}"
H="${SIZE#*x}"

echo "▶ Rendering $URL at $SIZE (wait ${WAIT}s) ..."

"$OBSCURA" fetch "$URL" \
  --screenshot "$OUT" \
  --wait "$WAIT"

[[ -f "$OUT" ]] || { echo "✗ screenshot failed" >&2; exit 1; }

echo "▶ Scaling to ${W}x${H} ..."
TMP="$OUT.scale.png"
ffmpeg -y -loglevel error -i "$OUT" \
  -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}" "$TMP"
mv "$TMP" "$OUT"

if [[ "$DARK" -eq 1 ]]; then
  echo "▶ Darkening for text overlay ..."
  TMP="$OUT.dark.png"
  ffmpeg -y -loglevel error -i "$OUT" \
    -vf "eq=brightness=-0.18:saturation=0.85,drawbox=c=black@0.35:t=fill" "$TMP"
  mv "$TMP" "$OUT"
fi

echo "✓ $(du -h "$OUT" | cut -f1): $OUT"
echo
echo "Use as video background:"
echo "  ffmpeg -loop 1 -i \"$OUT\" -i voice.wav -vf scale=${W}:${H} -c:v libx264 -t 12 -shortest out.mp4"
