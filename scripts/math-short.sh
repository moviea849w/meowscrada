#!/usr/bin/env bash
# math-short.sh — Hindi math quiz short: equation, options, countdown timer, Hindi voiceover
#
# Usage:
#   ./scripts/math-short.sh                 # default: 12 + 15 = ?
#   ./scripts/math-short.sh 7 8             # custom numbers
#   ./scripts/math-short.sh --no-upload     # render only
#
# Output:
#   .temp/math-<timestamp>.mp4
#   share URL printed at the end (tmpfiles.org)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/.temp"
mkdir -p "$OUT_DIR"

UPLOAD=1
ARGS=()
for a in "$@"; do
  case "$a" in
    --no-upload) UPLOAD=0 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) ARGS+=("$a") ;;
  esac
done

A="${ARGS[0]:-12}"
B="${ARGS[1]:-15}"
ANSWER=$((A + B))
THINK=9            # seconds of thinking time before reveal
TAIL=3             # seconds after reveal
TOTAL=$((THINK + TAIL))

FONT="/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf"
[[ -f "$FONT" ]] || FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# wrong options near the answer
WRONG1=$((ANSWER + 3))
WRONG2=$((ANSWER - 2))
WRONG3=$((ANSWER + 10))

# shuffle options into fixed positions
read -r O1 O2 O3 O4 <<<"$(printf '%s\n' "$ANSWER" "$WRONG1" "$WRONG2" "$WRONG3" | shuf | tr '\n' ' ')"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/math-$STAMP.mp4"
Q_WAV="$OUT_DIR/math-$STAMP-q.wav"
A_WAV="$OUT_DIR/math-$STAMP-a.wav"

# ---------- Hindi voiceover ----------
# Voiceover rule: everyday Hindi words, NO technical/English words.
# Numbers ARE spoken in English (12, 15, 27...), "+" said as "जोड़".
HI_Q="सवाल: ${A} जोड़ ${B} कितना होता है?"
HI_A="जवाब है ${ANSWER}"

echo "▶ Voiceover (Hindi) ..."
"$ROOT/scripts/tts" -l hi -o "$Q_WAV" "$HI_Q" >/dev/null 2>&1
"$ROOT/scripts/tts" -l hi -o "$A_WAV" "$HI_A" >/dev/null 2>&1

# ---------- video ----------
echo "▶ Rendering ${TOTAL}s math short: ${A} + ${B} = ?"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=0x101828:s=1080x1920:d=${TOTAL}:r=30" \
  -i "$Q_WAV" \
  -i "$A_WAV" \
  -filter_complex "\
[0:v]drawtext=fontfile='${FONT}':text='गणित क्विज़':fontcolor=0xffcc00:fontsize=64:x=(w-tw)/2:y=140,\
drawtext=fontfile='${FONT}':text='${A} + ${B} = ?':fontcolor=white:fontsize=170:x=(w-tw)/2:y=430,\
drawbox=x=90:y=700:w=900:h=150:color=0x223354@0.9:t=fill,\
drawtext=fontfile='${FONT}':text='A)  ${O1}':fontcolor=white:fontsize=90:x=170:y=740,\
drawbox=x=90:y=900:w=900:h=150:color=0x223354@0.9:t=fill,\
drawtext=fontfile='${FONT}':text='B)  ${O2}':fontcolor=white:fontsize=90:x=170:y=940,\
drawbox=x=90:y=1100:w=900:h=150:color=0x223354@0.9:t=fill,\
drawtext=fontfile='${FONT}':text='C)  ${O3}':fontcolor=white:fontsize=90:x=170:y=1140,\
drawbox=x=90:y=1300:w=900:h=150:color=0x223354@0.9:t=fill,\
drawtext=fontfile='${FONT}':text='D)  ${O4}':fontcolor=white:fontsize=90:x=170:y=1340,\
drawtext=fontfile='${FONT}':text='समय: %{eif\\:max(0\\,${THINK}-floor(t))\\:d}':fontcolor=0xff4444:fontsize=100:x=(w-tw)/2:y=1560:enable='lt(t,${THINK})',\
drawtext=fontfile='${FONT}':text='सही जवाब: ${ANSWER}':fontcolor=0x00e676:fontsize=120:x=(w-tw)/2:y=1550:enable='gte(t,${THINK})'[v];\
[1:a]adelay=300|300[q];\
[2:a]adelay=$(( (THINK+1)*1000 ))|$(( (THINK+1)*1000 ))[a];\
[q][a]amix=inputs=2:duration=longest:normalize=0,apad[aout]" \
  -map "[v]" -map "[aout]" \
  -t "$TOTAL" \
  -c:v libx264 -pix_fmt yuv420p -preset veryfast \
  -c:a aac -b:a 128k -movflags +faststart \
  "$OUT"

echo "✓ Rendered $(du -h "$OUT" | cut -f1): $OUT"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT"

if [[ "$UPLOAD" -eq 1 ]]; then
  echo "▶ Uploading ..."
  "$ROOT/scripts/tmpfiles" "$OUT"
fi
