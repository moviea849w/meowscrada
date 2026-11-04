#!/usr/bin/env bash
# make-short.sh — render a test vertical short and upload it to tmpfiles.org
#
# Usage:
#   ./scripts/make-short.sh                      # default test short
#   ./scripts/make-short.sh "TEXT" 10            # custom text, 10 seconds
#   ./scripts/make-short.sh --no-upload          # render only
#
# Output:
#   .temp/short-<timestamp>.mp4
#   share URL printed at the end (tmpfiles.org)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/.temp"
mkdir -p "$OUT_DIR"

TEXT="MEOW SORA"
DURATION=10
UPLOAD=1

# --- args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-upload) UPLOAD=0; shift ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) TEXT="$1"; shift; [[ $# -gt 0 ]] && { DURATION="$1"; shift; } ;;
  esac
done

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/short-$STAMP.mp4"

echo "▶ Rendering ${DURATION}s vertical short: \"$TEXT\""
echo "  output: $OUT"

# Escape text for drawtext
SAFE_TEXT="$(printf '%s' "$TEXT" | sed "s/'/\\\\'/g; s/:/\\\\:/g")"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=0x1a1a2e:s=1080x1920:d=${DURATION}:r=30" \
  -f lavfi -i "sine=frequency=440:duration=${DURATION}" \
  -vf "drawtext=text='${SAFE_TEXT}':fontcolor=white:fontsize=120:borderw=8:bordercolor=black:x=(w-tw)/2:y=(h-th)/2,drawtext=text='${DURATION}s short':fontcolor=0xffcc00:fontsize=60:x=(w-tw)/2:y=h-260" \
  -c:v libx264 -pix_fmt yuv420p -preset veryfast \
  -c:a aac -b:a 96k -shortest -movflags +faststart \
  "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo "✓ Rendered ($SIZE)"

if [[ "$UPLOAD" -eq 1 ]]; then
  echo "▶ Uploading to tmpfiles.org ..."
  RESP="$(curl -s -F "file=@$OUT" https://tmpfiles.org/api/v1/upload || true)"
  echo "  response: $RESP"

  # Response looks like: {"status":"success","data":{"url":"https://tmpfiles.org/12345/file.mp4"}}
  URL="$(printf '%s' "$RESP" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')"
  if [[ -n "$URL" ]]; then
    # tmpfiles direct-download link uses /dl/ instead of the page path
    DL="$(printf '%s' "$URL" | sed 's#tmpfiles.org/#tmpfiles.org/dl/#')"
    echo
    echo "🔗 Share link (page):   $URL"
    echo "🔗 Direct download:     $DL"
    echo "   (expires in ~1 hour)"
  else
    echo "✗ Upload failed or URL not found." >&2
    exit 1
  fi
else
  echo "ℹ Skipped upload (--no-upload)"
fi
