#!/usr/bin/env bash
# pipeline.sh — run ONE step of the long-form pipeline, or a range of steps.
#
# Every stage of longform.sh is callable on its own. Stages are cheap to re-run
# because their outputs are cached in .temp/<slug>/.
#
# Usage:
#   ./scripts/pipeline.sh <step> [episode] [flags]
#
# Steps (in order):
#   art      download artwork from Wikimedia/Wikipedia        -> assets/art/<slug>/
#   tts      Hindi narration per scene                        -> .temp/<slug>/audio/
#   still    Takumi scene still + Rough.js doodles            -> .temp/<slug>/stills/
#   clip     Ken Burns motion per still                       -> .temp/<slug>/clips/
#   merge    crossfade all clips into one video               -> .temp/<slug>/video.mp4
#   audio    narration (+ optional music) mix                 -> .temp/<slug>/mixed.mp4
#   upload   push the finished file to tmpfiles.org
#   all      art -> tts -> still -> clip -> merge -> audio -> upload
#
# Flags:
#   --force        redo this step even if its outputs exist
#   --scene N      only scene N (works with tts, still, clip)
#   --no-upload    for `all`
#   --pilot=N      for `all`, only the first N scenes
#
# Examples:
#   ./scripts/pipeline.sh still 001-medieval-king --scene 11
#   ./scripts/pipeline.sh clip  001-medieval-king --scene 11
#   ./scripts/pipeline.sh merge 001-medieval-king
#   ./scripts/pipeline.sh audio 001-medieval-king
#   ./scripts/pipeline.sh all   001-medieval-king --pilot=3

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || -z "${1:-}" ]]; then
  sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

STEP="$1"
shift

# default episode if the next arg is a flag or missing
SLUG="001-medieval-king"
if [[ $# -gt 0 && "$1" != --* ]]; then SLUG="$1"; shift; fi

EP_DIR="$ROOT/episodes/$SLUG"
WORK="$ROOT/.temp/$SLUG"
ART_DIR="$ROOT/assets/art/$SLUG"
SCENES="$EP_DIR/scenes.json"
EP_JSON="$EP_DIR/episode.json"
OUT="$WORK/final.mp4"

W=1920; H=1080; FPS=30; XFADE=0.8

FORCE=0
SCENE_SPEC=""
PILOT=0
PILOT_N=3
UPLOAD=1
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    --scene) SCENE_SPEC="__next__" ;;
    --scene=*) SCENE_SPEC="${a#--scene=}" ;;
    --pilot) PILOT=1 ;;
    --pilot=*) PILOT=1; PILOT_N="${a#--pilot=}" ;;
    --no-upload) UPLOAD=0 ;;
    -h|--help) sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) if [[ "$SCENE_SPEC" == "__next__" ]]; then SCENE_SPEC="$a"; fi ;;
  esac
done
[[ "$SCENE_SPEC" == "__next__" ]] && { echo "! --scene needs a value, e.g. --scene 3 or --scene 3-7 or --scene 1,4,9"; exit 1; }

# --scene accepts: 3 | 3-7 | 1,4,9 | 3-5,9  (1-based, inclusive)
expand_scenes() {
  local spec="$1"
  python3 - "$spec" <<'PY'
import sys
out = []
for part in sys.argv[1].split(","):
    part = part.strip()
    if not part: continue
    if "-" in part:
        a, b = part.split("-", 1)
        out.extend(range(int(a), int(b) + 1))
    else:
        out.append(int(part))
print("\n".join(f"{n:02d}" for n in sorted(set(out))))
PY
}
SCENES_LIST=""
[[ -n "$SCENE_SPEC" ]] && SCENES_LIST=$(expand_scenes "$SCENE_SPEC")
[[ -n "$SCENES_LIST" ]] && echo "◆ scenes: $(echo $SCENES_LIST | tr '\n' ' ')"

[[ -f "$SCENES" ]] || { echo "✗ no scenes.json in $EP_DIR"; exit 1; }
mkdir -p "$WORK/stills" "$WORK/clips" "$WORK/audio"

# how many scenes this run covers
N_TOTAL=$(jq 'length' "$SCENES")
N=$N_TOTAL
[[ "$PILOT" -eq 1 && "$N" -gt "$PILOT_N" ]] && N="$PILOT_N"

scene_indices() {
  if [[ -n "$SCENES_LIST" ]]; then echo "$SCENES_LIST"
  else for ((k = 1; k <= N; k++)); do printf '%02d\n' "$k"; done; fi
}

scene_json() { jq -c ".[$((10#$1 - 1))]" "$SCENES"; }

# ------------------------------------------------------------------ steps

step_art() {
  echo "▶ art"
  [[ -f "$EP_DIR/art.json" ]] || { echo "  (no art.json, skipping)"; return 0; }
  FORCE_REFETCH=$FORCE "$ROOT/scripts/art-fetch.sh" "$EP_DIR/art.json" "$ART_DIR"
}

step_tts() {
  echo "▶ tts"
  for idx in $(scene_indices); do
    out="$WORK/audio/$idx.wav"
    if [[ "$FORCE" -eq 0 && -s "$out" ]]; then echo "  · $idx cached"; continue; fi
    say=$(scene_json "$idx" | jq -r '.say // empty')
    if [[ -z "$say" ]]; then
      dur=4.0
      ffmpeg -y -hide_banner -loglevel error -f lavfi -i "anullsrc=r=22050:cl=mono" -t "$dur" "$out"
    else
      "$ROOT/scripts/tts" -l hi -o "$out" "$say" >/dev/null 2>&1
    fi
    echo "  ✓ $idx"
  done
}

bundle_scene() {
  [[ -s "$WORK/render-scene.mjs" ]] && [[ "$FORCE" -eq 0 ]] && return 0
  npx esbuild "$ROOT/assets/takumi/render-scene.tsx" \
    --bundle --platform=node --format=esm --external:takumi-js --jsx=automatic \
    --outfile="$WORK/render-scene.mjs" --loader:.tsx=tsx >/dev/null 2>&1
}

step_still() {
  echo "▶ still"
  bundle_scene
  for idx in $(scene_indices); do
    out="$WORK/stills/$idx.png"
    if [[ "$FORCE" -eq 0 && -s "$out" ]]; then echo "  · $idx cached"; continue; fi
    s=$(scene_json "$idx")
    art=$(jq -r '.art // empty' <<<"$s")
    artpath=""
    [[ -n "$art" ]] && artpath="$ART_DIR/$art.jpg"

    spec="$WORK/spec-$idx.json"
    jq --arg art "$artpath" '
      {template: (.template // (if .art then "lower-third" else "title" end)),
       art: $art, focus: (.focus // "center"), scrim: (.scrim // 0.28),
       kicker: (.kicker // null), title: (.text // null), sub: (.sub // null),
       stat: (.stat // null), titleSize: (.titleSize // null)}
    ' <<<"$s" > "$spec"

    node "$WORK/render-scene.mjs" --spec "$spec" --out "$WORK/stills/$idx.raw.png" >/dev/null

    doodles=$(jq -c '.doodles // empty' <<<"$s")
    if [[ -n "$doodles" ]]; then
      jq -n --argjson marks "$doodles" --argjson seed "$((10#$idx))" \
        '{width:1920, height:1080, color:"#d8a54a", seed:$seed, marks:$marks}' > "$WORK/doodles-$idx.json"
      node "$ROOT/assets/takumi/render-doodles.mjs" --spec "$WORK/doodles-$idx.json" --out "$WORK/stills/$idx.ov.png" >/dev/null 2>&1 \
        && ffmpeg -y -hide_banner -loglevel error -i "$WORK/stills/$idx.raw.png" -i "$WORK/stills/$idx.ov.png" \
             -filter_complex "[0:v][1:v]overlay=0:0" -frames:v 1 "$out"
      rm -f "$WORK/stills/$idx.ov.png"
    else
      mv "$WORK/stills/$idx.raw.png" "$out"
    fi
    echo "  ✓ $idx"
  done
}

step_clip() {
  echo "▶ clip"
  for idx in $(scene_indices); do
    out="$WORK/clips/$idx.mp4"
    if [[ "$FORCE" -eq 0 && -s "$out" ]]; then echo "  · $idx cached"; continue; fi
    [[ -s "$WORK/stills/$idx.png" ]] || { echo "  ✗ $idx — no still (run: still --scene $idx)"; continue; }
    [[ -s "$WORK/audio/$idx.wav" ]]  || { echo "  ✗ $idx — no audio (run: tts --scene $idx)"; continue; }

    motion=$(scene_json "$idx" | jq -r '.motion // "in"')
    adur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/audio/$idx.wav")
    dur=$(python3 -c "print(round(float('$adur') + 0.7, 3))")
    frames=$(python3 -c "print(int(round($dur*$FPS)))")

    case "$motion" in
      in)    z="min(zoom+0.0007,1.14)"; x="iw/2-(iw/zoom/2)"; y="ih/2-(ih/zoom/2)" ;;
      out)   z="if(lte(zoom,1.0),1.14,max(1.001,zoom-0.0007))"; x="iw/2-(iw/zoom/2)"; y="ih/2-(ih/zoom/2)" ;;
      left)  z="1.10"; x="(iw-iw/zoom)*(1-on/($frames-1))"; y="ih/2-(ih/zoom/2)" ;;
      right) z="1.10"; x="(iw-iw/zoom)*(on/($frames-1))"; y="ih/2-(ih/zoom/2)" ;;
      up)    z="1.10"; x="iw/2-(iw/zoom/2)"; y="(ih-ih/zoom)*(1-on/($frames-1))" ;;
      *)     z="1.08"; x="iw/2-(iw/zoom/2)"; y="ih/2-(ih/zoom/2)" ;;
    esac

    ffmpeg -y -hide_banner -loglevel error \
      -loop 1 -i "$WORK/stills/$idx.png" \
      -vf "scale=2400:-2,zoompan=z='$z':x='$x':y='$y':d=$frames:s=${W}x${H}:fps=$FPS,format=yuv420p" \
      -t "$dur" -r "$FPS" -c:v libx264 -preset veryfast -crf 18 "$out"
    printf '  ✓ %s  %.1fs\n' "$idx" "$dur"
  done
}

step_merge() {
  echo "▶ merge"
  # merge always covers every clip present on disk, not just this run's range
  local clips=()
  for ((k = 1; k <= N_TOTAL; k++)); do
    f="$WORK/clips/$(printf '%02d' "$k").mp4"
    [[ -s "$f" ]] && clips+=("$f")
  done
  local n=${#clips[@]}
  [[ "$n" -gt 0 ]] || { echo "  ✗ no clips"; return 1; }
  if [[ "$FORCE" -eq 0 && -s "$WORK/video.mp4" ]]; then
    echo "  · cached (use --force to redo)"; return 0
  fi

  local inputs=()
  for f in "${clips[@]}"; do inputs+=(-i "$f"); done

  python3 - "$n" "$XFADE" "$WORK/clips" > "$WORK/merge-filter.txt" <<'PY'
import sys, subprocess, json, os
n, xf = int(sys.argv[1]), float(sys.argv[2])
folder = sys.argv[3]
if n == 1:
    print("[0:v]copy[vout]"); sys.exit()
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

  ffmpeg -y -hide_banner -loglevel error "${inputs[@]}" \
    -filter_complex_script "$WORK/merge-filter.txt" \
    -map "[vout]" -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p "$WORK/video.mp4"
  echo "  ✓ $WORK/video.mp4"
}

step_audio() {
  echo "▶ audio"
  if [[ "$FORCE" -eq 0 && -s "$OUT" ]]; then echo "  · cached (use --force to redo)"; return 0; fi
  [[ -s "$WORK/video.mp4" ]] || { echo "  ✗ no merged video (run: merge)"; return 1; }

  local audio=()
  local durs=()
  for ((k = 1; k <= N_TOTAL; k++)); do
    a="$WORK/audio/$(printf '%02d' "$k").wav"
    [[ -s "$a" ]] || { echo "  ✗ missing narration for scene $k"; return 1; }
    audio+=(-i "$a")
    durs+=("$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/clips/$(printf '%02d' "$k").mp4")")
  done

  python3 - "$N_TOTAL" "$XFADE" "${durs[@]}" > "$WORK/audio-filter.txt" <<'PY'
import sys
n, xf = int(sys.argv[1]), float(sys.argv[2])
durs = [float(d) for d in sys.argv[3:]]
starts, t = [], 0.0
for k in range(n):
    starts.append(t); t += durs[k] - xf
parts = [f"[{k+1}:a]adelay={int(round(starts[k]*1000))}|{int(round(starts[k]*1000))}[a{k}]"
         for k in range(n)]
mix = "".join(f"[a{k}]" for k in range(n))
parts.append(f"{mix}amix=inputs={n}:duration=longest:normalize=0,"
             f"alimiter=limit=0.89:level=false,aresample=48000[anarr]")
print(";".join(parts))
PY

  local track="" gain="-26"
  if [[ -f "$EP_JSON" ]]; then
    track=$(jq -r '.music.track // empty' "$EP_JSON")
    gain=$(jq -r '.music.gain // -26' "$EP_JSON")
  fi
  local music="$ROOT/assets/music/${track}.mp3"
  local dur
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/video.mp4")

  if [[ -n "$track" && -f "$music" ]]; then
    echo "  + music: $track (${gain} dB)"
    python3 - "$WORK" "$N_TOTAL" "$gain" > "$WORK/music-filter.txt" <<'PY'
import sys
work, n, gain = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
parts = [open(f"{work}/audio-filter.txt").read().strip().rstrip(";")]
parts.append(f"[{n+1}:a]volume={gain}dB,afade=t=in:st=0:d=2[mfade]")
parts.append("[anarr][mfade]amix=inputs=2:duration=first:normalize=0,"
             "alimiter=limit=0.89:level=false,aresample=48000[afinal]")
print(";".join(parts))
PY
    ffmpeg -y -hide_banner -loglevel error \
      -i "$WORK/video.mp4" "${audio[@]}" -stream_loop -1 -i "$music" \
      -filter_complex_script "$WORK/music-filter.txt" \
      -map 0:v -map "[afinal]" -c:v copy -c:a aac -b:a 160k -movflags +faststart \
      -t "$dur" "$OUT"
  else
    ffmpeg -y -hide_banner -loglevel error \
      -i "$WORK/video.mp4" "${audio[@]}" \
      -filter_complex_script "$WORK/audio-filter.txt" \
      -map 0:v -map "[anarr]" -c:v copy -c:a aac -b:a 160k -movflags +faststart \
      -shortest "$OUT"
  fi
  echo "  ✓ $OUT"
}

step_upload() {
  echo "▶ upload"
  [[ -s "$OUT" ]] || { echo "  ✗ nothing to upload (run: audio)"; return 1; }
  local named="$ROOT/.temp/$SLUG-$(date +%Y%m%d-%H%M%S).mp4"
  cp "$OUT" "$named"
  "$ROOT/scripts/tmpfiles" "$named"
}

# ------------------------------------------------------------------ run

case "$STEP" in
  art)    step_art ;;
  tts)    step_tts ;;
  still)  step_still ;;
  clip)   step_clip ;;
  merge)  step_merge ;;
  audio)  step_audio ;;
  upload) step_upload ;;
  all)
    step_art && step_tts && step_still && step_clip && step_merge && step_audio \
      && { [[ "$UPLOAD" -eq 1 ]] && step_upload || echo "✓ $OUT"; }
    ;;
  *) echo "✗ unknown step: $STEP"; sed -n '6,16p' "$0"; exit 1 ;;
esac
