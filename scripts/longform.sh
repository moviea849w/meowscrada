#!/usr/bin/env bash
# longform.sh — build a long-form episode: Takumi scene stills → Ken Burns clips → merged video
#
# Pipeline per episode:
#   1. art-fetch.sh      download artwork from Wikimedia/Wikipedia APIs
#   2. tts               Hindi narration per scene
#   3. render-scene.tsx  Takumi renders each scene still (art + vignette + English text)
#   4. ffmpeg zoompan    each still becomes a moving clip, length = narration length
#   5. ffmpeg xfade      clips crossfade into one video
#   6. ffmpeg amix       narration laid on the timeline
#
# Usage:
#   ./scripts/longform.sh episodes/001-medieval-king            # full render + upload
#   ./scripts/longform.sh episodes/001-medieval-king --pilot    # first 3 scenes only
#   ./scripts/longform.sh episodes/001-medieval-king --no-upload
#
# Needs in the episode folder:
#   scenes.json   [{ "art": "richard", "kind": "art", "text": "...", "say": "...", "motion": "in" }]
#   art.json      art-fetch.sh input (optional if scenes use no art)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EP_DIR="${1:?usage: longform.sh EPISODE_DIR [--pilot] [--no-upload]}"
shift

UPLOAD=1
PILOT=0
PILOT_N=3
for a in "$@"; do
  case "$a" in
    --no-upload) UPLOAD=0 ;;
    --pilot) PILOT=1 ;;
    --pilot=*) PILOT=1; PILOT_N="${a#--pilot=}" ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
  esac
done

EP_DIR="$(cd "$EP_DIR" && pwd)"
SLUG="$(basename "$EP_DIR")"
SCENES="$EP_DIR/scenes.json"
ART_JSON="$EP_DIR/art.json"
ART_DIR="$ROOT/assets/art/$SLUG"
WORK="$ROOT/.temp/$SLUG"
mkdir -p "$WORK/stills" "$WORK/clips" "$WORK/audio"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/.temp/$SLUG-$STAMP.mp4"

W=1920; H=1080; FPS=30; XFADE=0.8

# ---------- 1. art ----------
if [[ -f "$ART_JSON" ]]; then
  echo "▶ Artwork"
  "$ROOT/scripts/art-fetch.sh" "$ART_JSON" "$ART_DIR"
fi

# ---------- 2. scenes ----------
N=$(jq 'length' "$SCENES")
[[ "$PILOT" -eq 1 && "$N" -gt "$PILOT_N" ]] && N="$PILOT_N"
echo "▶ $N scenes"

# bundle the renderer once
npx esbuild "$ROOT/assets/takumi/render-scene.tsx" \
  --bundle --platform=node --format=esm --external:takumi-js --jsx=automatic \
  --outfile="$WORK/render-scene.mjs" --loader:.tsx=tsx >/dev/null 2>&1

# ---------- 3+4. stills, narration, motion clips ----------
DURS=()
i=0
while [[ $i -lt $N ]]; do
  s=$(jq -c ".[$i]" "$SCENES")
  idx=$(printf '%02d' $((i + 1)))

  art=$(jq -r '.art // empty' <<<"$s")
  say=$(jq -r '.say // empty' <<<"$s")
  motion=$(jq -r '.motion // "in"' <<<"$s")
  scene_audio="$WORK/audio/$idx.wav"

  # narration
  if [[ -n "$say" ]]; then
    "$ROOT/scripts/tts" -l hi -o "$scene_audio" "$say" >/dev/null 2>&1
    # add breathing room after each line
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$scene_audio")
    dur=$(python3 -c "print(round(float('$dur') + 0.7, 3))")
  else
    dur=4.0
    ffmpeg -y -hide_banner -loglevel error -f lavfi -i "anullsrc=r=22050:cl=mono" -t "$dur" "$scene_audio"
  fi

  # still — pass the whole scene through so templates get template/stat/sub
  spec="$WORK/spec-$idx.json"
  artpath=""
  [[ -n "$art" ]] && artpath="$ART_DIR/$art.jpg"
  jq --arg art "$artpath" '
    {template: (.template // (if .art then "lower-third" else "title" end)),
     art: $art, focus: (.focus // "center"), scrim: (.scrim // 0.28),
     kicker: (.kicker // null), title: (.text // null), sub: (.sub // null),
     stat: (.stat // null), titleSize: (.titleSize // null)}
  ' <<<"$s" > "$spec"

  node "$WORK/render-scene.mjs" --spec "$spec" --out "$WORK/stills/$idx.raw.png" >/dev/null

  # optional hand-drawn annotations (Rough.js) composited over the still
  doodles=$(jq -c '.doodles // empty' <<<"$s")
  if [[ -n "$doodles" ]]; then
    jq -n --argjson marks "$doodles" --argjson seed "${i}" \
      '{width:1920, height:1080, color:"#d8a54a", seed:$seed, marks:$marks}' > "$WORK/doodles-$idx.json"
    node "$ROOT/assets/takumi/render-doodles.mjs" --spec "$WORK/doodles-$idx.json" --out "$WORK/stills/$idx.png" >/dev/null 2>&1 \
      || { echo "  ! doodles failed for scene $idx"; cp "$WORK/stills/$idx.raw.png" "$WORK/stills/$idx.png"; }
    ffmpeg -y -hide_banner -loglevel error -i "$WORK/stills/$idx.raw.png" -i "$WORK/stills/$idx.png" \
      -filter_complex "[0:v][1:v]overlay=0:0" -frames:v 1 "$WORK/stills/$idx.raw.png.tmp.png"
    mv "$WORK/stills/$idx.raw.png.tmp.png" "$WORK/stills/$idx.png"
  else
    mv "$WORK/stills/$idx.raw.png" "$WORK/stills/$idx.png"
  fi

  # Ken Burns motion from the still
  frames=$(python3 -c "print(int(round($dur*$FPS)))")
  case "$motion" in
    in)    zexpr="min(zoom+0.0007,1.14)"; xexpr="iw/2-(iw/zoom/2)"; yexpr="ih/2-(ih/zoom/2)" ;;
    out)   zexpr="if(lte(zoom,1.0),1.14,max(1.001,zoom-0.0007))"; xexpr="iw/2-(iw/zoom/2)"; yexpr="ih/2-(ih/zoom/2)" ;;
    left)  zexpr="1.10"; xexpr="(iw-iw/zoom)*(1-on/($frames-1))"; yexpr="ih/2-(ih/zoom/2)" ;;
    right) zexpr="1.10"; xexpr="(iw-iw/zoom)*(on/($frames-1))"; yexpr="ih/2-(ih/zoom/2)" ;;
    up)    zexpr="1.10"; xexpr="iw/2-(iw/zoom/2)"; yexpr="(ih-ih/zoom)*(1-on/($frames-1))" ;;
    *)     zexpr="1.08"; xexpr="iw/2-(iw/zoom/2)"; yexpr="ih/2-(ih/zoom/2)" ;;
  esac

  ffmpeg -y -hide_banner -loglevel error \
    -loop 1 -i "$WORK/stills/$idx.png" \
    -vf "scale=2400:-2,zoompan=z='$zexpr':x='$xexpr':y='$yexpr':d=$frames:s=${W}x${H}:fps=$FPS,format=yuv420p" \
    -t "$dur" -r "$FPS" -c:v libx264 -preset veryfast -crf 18 "$WORK/clips/$idx.mp4"

  DURS+=("$dur")
  printf '  ✓ scene %s  %.1fs  %s\n' "$idx" "$dur" "${say:0:48}"
  i=$((i + 1))
done

# ---------- 5. crossfade merge ----------
# NOTE: a plain fade between two text-heavy frames reads as two overlapping
# headlines. `fadeblack` passes through black instead, so only one headline is
# ever legible at a time.
echo "▶ Merging $N clips"
INPUTS=()
for ((k = 1; k <= N; k++)); do
  INPUTS+=(-i "$WORK/clips/$(printf '%02d' "$k").mp4")
done

python3 - "$N" "$XFADE" "$WORK/clips" > "$WORK/merge-filter.txt" <<'PY'
import sys, subprocess, json, os
n, xf = int(sys.argv[1]), float(sys.argv[2])
folder = sys.argv[3]
if n == 1:
    print("[0:v]copy[vout]")
    sys.exit()
durs = []
for k in range(1, n + 1):
    p = os.path.join(folder, f"{k:02d}.mp4")
    out = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","json",p],
                         capture_output=True, text=True).stdout
    durs.append(float(json.loads(out)["format"]["duration"]))
parts, cur, total = [], "[0:v]", 0.0
for k in range(1, n):
    total += durs[k-1] - xf
    nxt = f"[v{k}]" if k < n - 1 else "[vout]"
    parts.append(f"{cur}[{k}:v]xfade=transition=fadeblack:duration={xf}:offset={total:.3f}{nxt}")
    cur = f"[v{k}]"
print(";".join(parts))
PY

ffmpeg -y -hide_banner -loglevel error "${INPUTS[@]}" \
  -filter_complex_script "$WORK/merge-filter.txt" \
  -map "[vout]" -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p "$WORK/video.mp4"

# ---------- 6. narration timeline ----------
echo "▶ Mixing narration"
python3 - "$N" "$XFADE" "$WORK" "${DURS[@]}" > "$WORK/audio-filter.txt" <<'PY'
import sys
n, xf, work = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3]
durs = [float(d) for d in sys.argv[4:]]
# each clip starts where the previous xfade begins, so audio follows the visuals
starts, t = [], 0.0
for k in range(n):
    starts.append(t)
    t += durs[k] - xf
parts = []
# input 0 is the merged video, so the WAVs start at 1
for k in range(n):
    ms = int(round(starts[k] * 1000))
    parts.append(f"[{k + 1}:a]adelay={ms}|{ms}[a{k}]")
mix = "".join(f"[a{k}]" for k in range(n))
parts.append(f"{mix}amix=inputs={n}:duration=longest:normalize=0,"
             f"alimiter=limit=0.89:level=false,aresample=48000[aout]")
print(";".join(parts))
PY

AUDIO_IN=()
for ((k = 1; k <= N; k++)); do
  AUDIO_IN+=(-i "$WORK/audio/$(printf '%02d' "$k").wav")
done

ffmpeg -y -hide_banner -loglevel error \
  -i "$WORK/video.mp4" "${AUDIO_IN[@]}" \
  -filter_complex_script "$WORK/audio-filter.txt" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 160k -movflags +faststart \
  -shortest "$OUT"

echo "✓ $(du -h "$OUT" | cut -f1)  $OUT"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT" | xargs printf '  duration: %ss\n'

if [[ "$UPLOAD" -eq 1 ]]; then
  "$ROOT/scripts/tmpfiles" "$OUT"
fi
