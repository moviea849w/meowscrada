#!/usr/bin/env bash
# math-short.sh — Hindi math quiz short: equation, options, countdown timer, Hindi voiceover
#
# Cards are rendered with Takumi (assets/takumi/render-math.tsx) using the Poppins
# font — no headless browser. ffmpeg then animates the timer/progress bar and mixes
# the Hindi voiceover.
#
# Usage:
#   ./scripts/math-short.sh                 # default: 12 + 15 = ?
#   ./scripts/math-short.sh 7 8             # custom numbers
#   ./scripts/math-short.sh --no-upload     # render only
#
# Output:
#   .temp/math-<timestamp>.mp4

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/.temp"
mkdir -p "$OUT_DIR"

UPLOAD=1
ARGS=()
for a in "$@"; do
  case "$a" in
    --no-upload) UPLOAD=0 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) ARGS+=("$a") ;;
  esac
done

A="${ARGS[0]:-12}"
B="${ARGS[1]:-15}"
ANSWER=$((A + B))
THINK=9
TAIL=3
TOTAL=$((THINK + TAIL))

FONT_EN="$ROOT/assets/fonts/Poppins-ExtraBold.ttf"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/math-$STAMP.mp4"
Q_WAV="$OUT_DIR/math-$STAMP-q.wav"
A_WAV="$OUT_DIR/math-$STAMP-a.wav"
CARD_Q="$OUT_DIR/math-$STAMP-q.png"
CARD_A="$OUT_DIR/math-$STAMP-a.png"

# ---------- Hindi voiceover (numbers in English, no technical words) ----------
HI_Q="सवाल: ${A} जोड़ ${B} कितना होता है?"
HI_A="जवाब है ${ANSWER}"

echo "▶ Voiceover (Hindi) ..."
"$ROOT/scripts/tts" -l hi -o "$Q_WAV" "$HI_Q" >/dev/null 2>&1
"$ROOT/scripts/tts" -l hi -o "$A_WAV" "$HI_A" >/dev/null 2>&1

# ---------- cards via Takumi ----------
echo "▶ Rendering cards (Takumi) ..."
npx esbuild "$ROOT/assets/takumi/render-math.tsx" \
  --bundle --platform=node --format=esm --external:takumi-js --jsx=automatic \
  --outfile="$OUT_DIR/render-math.mjs" --loader:.tsx=tsx >/dev/null 2>&1
node "$OUT_DIR/render-math.mjs" --a "$A" --b "$B" --state question --out "$CARD_Q" >/dev/null
node "$OUT_DIR/render-math.mjs" --a "$A" --b "$B" --state answer   --out "$CARD_A" >/dev/null

# ---------- video ----------
echo "▶ Rendering ${TOTAL}s math short: ${A} + ${B} = ?"

ffmpeg -y -hide_banner -loglevel error \
  -loop 1 -i "$CARD_Q" \
  -loop 1 -i "$CARD_A" \
  -i "$Q_WAV" \
  -i "$A_WAV" \
  -filter_complex "\
[0:v]scale=1080:1920,setsar=1,fps=30,\
drawbox=x=66:y=1740:w=948:h=16:color=0x2a2e37@1:t=fill,\
drawbox=x=66:y=1740:w='948*min(t/${THINK},1)':h=16:color=0xe8b44a@1:t=fill:enable='lt(t,${THINK})',\
drawtext=fontfile='${FONT_EN}':text='%{eif\\:max(0\\,${THINK}-floor(t))\\:d}':fontcolor=0xe8b44a:fontsize=64:x=(w-tw)/2:y=1600:enable='lt(t,${THINK})'[q];\
[1:v]scale=1080:1920,setsar=1,fps=30[ans];\
[q][ans]overlay=enable='gte(t,${THINK})'[v];\
[2:a]adelay=300|300[qa];\
[3:a]adelay=$(( (THINK+1)*1000 ))|$(( (THINK+1)*1000 ))[aa];\
[qa][aa]amix=inputs=2:duration=longest:normalize=0,apad[aout]" \
  -map "[v]" -map "[aout]" \
  -t "$TOTAL" \
  -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 19 \
  -c:a aac -b:a 128k -movflags +faststart \
  "$OUT"

echo "✓ Rendered $(du -h "$OUT" | cut -f1): $OUT"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT"

if [[ "$UPLOAD" -eq 1 ]]; then
  echo "▶ Uploading ..."
  "$ROOT/scripts/tmpfiles" "$OUT"
fi
