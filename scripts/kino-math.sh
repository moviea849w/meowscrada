#!/usr/bin/env bash
# kino-math.sh — build a Hindi math quiz short declaratively with Kino (JSON → MP4)
#
# Kino compiles a JSON composition into MP4 via FFmpeg. This script generates the
# composition (scenes, text, timer) plus the Hindi voiceover, then renders it.
#
# Usage:
#   ./scripts/kino-math.sh                  # default: 12 + 15 = ?
#   ./scripts/kino-math.sh 7 8
#   ./scripts/kino-math.sh --no-upload
#
# Output:
#   .temp/kino-math-<timestamp>.mp4

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/.temp"
mkdir -p "$OUT_DIR"

UPLOAD=1
ARGS=()
for a in "$@"; do
  case "$a" in
    --no-upload) UPLOAD=0 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) ARGS+=("$a") ;;
  esac
done

A="${ARGS[0]:-12}"
B="${ARGS[1]:-15}"
ANSWER=$((A + B))
THINK=9
TAIL=3
TOTAL=$((THINK + TAIL))

STAMP="$(date +%Y%m%d-%H%M%S)"
JSON="$OUT_DIR/kino-math-$STAMP.json"
OUT="$OUT_DIR/kino-math-$STAMP.mp4"
Q_WAV="$OUT_DIR/kino-math-$STAMP-q.wav"
A_WAV="$OUT_DIR/kino-math-$STAMP-a.wav"

# ---------- Hindi voiceover (numbers in English, no technical words) ----------
echo "▶ Voiceover (Hindi) ..."
"$ROOT/scripts/tts" -l hi -o "$Q_WAV" "सवाल: ${A} जोड़ ${B} कितना होता है?" >/dev/null 2>&1
"$ROOT/scripts/tts" -l hi -o "$A_WAV" "जवाब है ${ANSWER}" >/dev/null 2>&1

# options: correct + 3 distractors, stable order per problem
OPTS=$(python3 - "$A" "$B" "$ANSWER" <<'PY'
import sys, json
a, b, ans = map(int, sys.argv[1:4])
pool = [ans, ans + 3, ans - 2, ans + 10]
seed = (a * 31 + b * 17) % 4
print(json.dumps(pool[seed:] + pool[:seed]))
PY
)

# ---------- Kino composition ----------
echo "▶ Building Kino composition ..."
python3 - "$A" "$B" "$ANSWER" "$THINK" "$TAIL" "$TOTAL" "$Q_WAV" "$A_WAV" "$OPTS" "$JSON" <<'PY'
import json, sys
A, B, ANS, THINK, TAIL, TOTAL, QWAV, AWAV, OPTS, OUT = sys.argv[1:11]
A, B, ANS, THINK, TAIL, TOTAL = int(A), int(B), int(ANS), int(THINK), int(TAIL), int(TOTAL)
opts = json.loads(OPTS)
letters = "ABCD"

W, H = 1080, 1920
BG = "#111318"
SURFACE = "#191c23"
LINE = "#2a2e37"
TEXT = "#f2f3f5"
DIM = "#9aa0ab"
ACCENT = "#e8b44a"
OK = "#3fbf8f"

def text(content, size, color, y, start=0, dur=TOTAL, weight=None):
    el = {"type": "text", "content": content, "fontSize": size, "fontColor": color,
          "x": "center", "y": y, "startAt": start, "duration": dur}
    return el

# --- question scene ---
q_elements = [
    text("Math quiz", 40, TEXT, 120),
    text(f"{A} + {B} = ?", 124, TEXT, 420),
]
for i, v in enumerate(opts):
    q_elements.append(text(f"{letters[i]}    {v}", 74, TEXT, 700 + i * 170))

q_scene = {"duration": THINK, "background": BG, "elements": q_elements}

# --- answer scene ---
a_elements = [
    text("Math quiz", 40, TEXT, 120),
    text(f"{A} + {B} = ?", 124, TEXT, 420),
    text("Answer", 38, DIM, 1330),
    text(str(ANS), 148, OK, 1450),
]
a_scene = {"duration": TAIL, "background": BG, "elements": a_elements}

comp = {
    "width": W, "height": H, "fps": 30,
    "scenes": [q_scene, a_scene],
}

with open(OUT, "w") as f:
    json.dump(comp, f, indent=2)
print(f"  composition: {OUT}")
PY

# ---------- render ----------
echo "▶ Rendering ${TOTAL}s with Kino ..."
KINO="$ROOT/node_modules/@glitchoff/kino/dist/cli.js"
FFMPEG_PATH="$(command -v ffmpeg)" node "$KINO" "$JSON" -o "$OUT" --encoder libx264 2>&1 | tail -3

echo "✓ $(du -h "$OUT" | cut -f1): $OUT"

# ---------- mix voiceover ----------
MIXED="${OUT%.mp4}-mixed.mp4"
echo "▶ Mixing Hindi voiceover ..."
ffmpeg -y -hide_banner -loglevel error \
  -i "$OUT" -i "$Q_WAV" -i "$A_WAV" \
  -filter_complex "[1:a]adelay=300|300[q];[2:a]adelay=$(( (THINK+1)*1000 ))|$(( (THINK+1)*1000 ))[a];[q][a]amix=inputs=2:duration=longest:normalize=0,apad[aout]" \
  -map 0:v -map "[aout]" -t "$TOTAL" -c:v copy -c:a aac -b:a 128k -movflags +faststart \
  "$MIXED"
mv "$MIXED" "$OUT"

echo "✓ Final: $(du -h "$OUT" | cut -f1): $OUT"

if [[ "$UPLOAD" -eq 1 ]]; then
  echo "▶ Uploading ..."
  "$ROOT/scripts/tmpfiles" "$OUT"
fi
