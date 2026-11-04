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

# Devanagari font for Hindi text; DejaVu for Latin letters/symbols (A/B/C/D, check mark)
FONT_HI="/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf"
FONT_EN="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
[[ -f "$FONT_HI" ]] || FONT_HI="$FONT_EN"
FONT="$FONT_HI"

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

# Option box colours: correct turns green, others dim after reveal
pos_of() { # $1 = value -> prints A/B/C/D
  [[ "$1" == "$ANSWER" ]] && echo "correct" || echo "wrong"
}
CORRECT_POS=""
for i in 1 2 3 4; do
  v=$(eval echo "\$O$i")
  [[ "$v" == "$ANSWER" ]] && CORRECT_POS=$i
done

# option box y positions
Y=(700 900 1100 1300)
VF=""
# header + equation
VF+="drawbox=x=0:y=0:w=1080:h=14:color=0xffcc00:t=fill,"
VF+="drawtext=fontfile='${FONT_HI}':text='गणित क्विज़':fontcolor=0xffcc00:fontsize=66:x=(w-tw)/2:y=140,"
VF+="drawtext=fontfile='${FONT_EN}':text='${A} + ${B} = ?':fontcolor=white:fontsize=180:x=(w-tw)/2:y=400,"

for i in 1 2 3 4; do
  v=$(eval echo "\$O$i")
  y=${Y[$((i-1))]}
  label=$(printf '%s' "ABCD" | cut -c$i)
  # normal state: latin letter + number (DejaVu has digits/letters)
  VF+="drawbox=x=90:y=${y}:w=900:h=150:color=0x223354@0.92:t=fill:enable='lt(t,${THINK})',"
  VF+="drawtext=fontfile='${FONT_EN}':text='${label})  ${v}':fontcolor=white:fontsize=92:x=160:y=$((y+34)):enable='lt(t,${THINK})',"
  # reveal state
  if [[ "$i" == "$CORRECT_POS" ]]; then
    VF+="drawbox=x=90:y=${y}:w=900:h=150:color=0x00a152@0.95:t=fill:enable='gte(t,${THINK})',"
    VF+="drawtext=fontfile='${FONT_EN}':text='${label})  ${v}   OK':fontcolor=white:fontsize=92:x=150:y=$((y+34)):enable='gte(t,${THINK})',"
  else
    VF+="drawbox=x=90:y=${y}:w=900:h=150:color=0x1b2333@0.55:t=fill:enable='gte(t,${THINK})',"
    VF+="drawtext=fontfile='${FONT_EN}':text='${label})  ${v}':fontcolor=0x8a94a6:fontsize=92:x=160:y=$((y+34)):enable='gte(t,${THINK})',"
  fi
done

# countdown ring text + progress bar
VF+="drawtext=fontfile='${FONT_EN}':text='%{eif\\:max(0\\,${THINK}-floor(t))\\:d}':fontfile='${FONT_EN}':fontcolor=0xff4444:fontsize=130:x=(w-tw)/2:y=1520:enable='lt(t,${THINK})',"
VF+="drawtext=fontfile='${FONT_HI}':text='सही जवाब':fontcolor=0x00e676:fontsize=100:x=(w-tw)/2:y=1500:enable='gte(t,${THINK})',"
VF+="drawtext=fontfile='${FONT_EN}':text='${ANSWER}':fontcolor=0x00e676:fontsize=130:x=(w-tw)/2:y=1570:enable='gte(t,${THINK})',"
VF+="drawbox=x=90:y=1700:w='900*min(t/${THINK},1)':h=18:color=0xffcc00@0.9:t=fill:enable='lt(t,${THINK})',"
VF+="drawbox=x=90:y=1700:w=900:h=18:color=0x223354@0.8:t=fill:enable='gte(t,${THINK})',"
VF+="drawbox=x=90:y=1700:w=900:h=18:color=0x00e676@0.9:t=fill:enable='gte(t,${THINK})',"
VF+="drawtext=fontfile='${FONT}':text='@meowscrada':fontfile='${FONT_EN}':fontcolor=0x5b6478:fontsize=44:x=(w-tw)/2:y=1790"
VF+="[v]"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=0x101828:s=1080x1920:d=${TOTAL}:r=30" \
  -i "$Q_WAV" \
  -i "$A_WAV" \
  -filter_complex "[0:v]${VF};[1:a]adelay=300|300[q];[2:a]adelay=$(( (THINK+1)*1000 ))|$(( (THINK+1)*1000 ))[a];[q][a]amix=inputs=2:duration=longest:normalize=0,apad[aout]" \
  -map "[v]" -map "[aout]" \
  -t "$TOTAL" \
  -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 20 \
  -c:a aac -b:a 128k -movflags +faststart \
  "$OUT"

echo "✓ Rendered $(du -h "$OUT" | cut -f1): $OUT"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT"

if [[ "$UPLOAD" -eq 1 ]]; then
  echo "▶ Uploading ..."
  "$ROOT/scripts/tmpfiles" "$OUT"
fi
