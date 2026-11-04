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
RENDERER="scene"
VOICE_LANG="hi"
VOICE=""

# episode.json can switch an episode to vertical storyboard mode:
#   { "format": "storyboard", "voice": "en", "voiceName": "en_US-ryan-high" }
if [[ -f "$EP_JSON" ]]; then
  if [[ "$(jq -r '.format // empty' "$EP_JSON")" == "storyboard" ]]; then
    RENDERER="storyboard"; W=1080; H=1920
  fi
  v=$(jq -r '.voice // empty' "$EP_JSON")
  [[ -n "$v" ]] && VOICE_LANG="$v"
  v=$(jq -r '.voiceName // empty' "$EP_JSON")
  [[ -n "$v" ]] && VOICE="$v"
fi

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
  # Piper is single-threaded, so run several lines at once. Each scene writes its
  # own WAV, so there is nothing to lock. Cores come from the machine, capped at 4.
  local jobs=$(( $(nproc) ))
  (( jobs > 4 )) && jobs=4
  (( jobs < 1 )) && jobs=1
  echo "  · ${jobs} parallel"

  local todo=()
  for idx in $(scene_indices); do
    out="$WORK/audio/$idx.wav"
    if [[ "$FORCE" -eq 0 && -s "$out" ]]; then echo "  · $idx cached"; continue; fi
    todo+=("$idx")
  done
  [[ ${#todo[@]} -eq 0 ]] && return 0

  tts_one() {
    local idx="$1"
    local out="$WORK/audio/$idx.wav"
    local say
    say=$(scene_json "$idx" | jq -r '.say // empty')
    if [[ -z "$say" ]]; then
      ffmpeg -y -hide_banner -loglevel error -f lavfi -i "anullsrc=r=22050:cl=mono" -t 4.0 "$out"
      return 0
    fi
    local vargs=(-l "$VOICE_LANG")
    [[ -n "$VOICE" ]] && vargs=(-v "$VOICE")
    "$ROOT/scripts/tts" "${vargs[@]}" -o "$out" "$say" >/dev/null 2>&1
  }
  export -f tts_one scene_json
  export WORK VOICE_LANG VOICE ROOT SCENES

  printf '%s\n' "${todo[@]}" | xargs -P "$jobs" -I{} bash -c 'tts_one "$@"' _ {}

  for idx in "${todo[@]}"; do
    [[ -s "$WORK/audio/$idx.wav" ]] && echo "  ✓ $idx" || echo "  ✗ $idx"
  done
}
bundle_scene() {
  local src="$ROOT/assets/takumi/render-scene.tsx"
  [[ "$RENDERER" == "storyboard" ]] && src="$ROOT/assets/takumi/render-storyboard.tsx"
  if [[ -s "$WORK/render-scene.mjs" ]] && [[ "$FORCE" -eq 0 ]]; then :; else
    npx esbuild "$src" \
      --bundle --platform=node --format=esm --external:takumi-js --jsx=automatic \
      --outfile="$WORK/render-scene.mjs" --loader:.tsx=tsx >/dev/null 2>&1
  fi
  # animated scenes need the keyframe renderer too
  if [[ -s "$WORK/render-frames.mjs" ]] && [[ "$FORCE" -eq 0 ]]; then :; else
    npx esbuild "$ROOT/assets/takumi/render-frames.tsx" \
      --bundle --platform=node --format=esm --external:takumi-js --jsx=automatic \
      --outfile="$WORK/render-frames.mjs" --loader:.tsx=tsx >/dev/null 2>&1
  fi
  # footage scenes need the transparent type overlay
  if [[ -s "$WORK/render-overlay.mjs" ]] && [[ "$FORCE" -eq 0 ]]; then :; else
    npx esbuild "$ROOT/assets/takumi/render-overlay.tsx" \
      --bundle --platform=node --format=esm --external:takumi-js --jsx=automatic \
      --outfile="$WORK/render-overlay.mjs" --loader:.tsx=tsx >/dev/null 2>&1
  fi
}

step_still() {
  echo "▶ still ($RENDERER ${W}x${H})"
  bundle_scene
  for idx in $(scene_indices); do
    out="$WORK/stills/$idx.png"
    if [[ "$FORCE" -eq 0 && -s "$out" ]]; then echo "  · $idx cached"; continue; fi
    s=$(scene_json "$idx")
    # footage and animated scenes have no still; skip them cleanly
    if [[ -n "$(jq -r '.footage // empty' <<<"$s")" || -n "$(jq -r '.animate // empty' <<<"$s")" ]]; then
      echo "  · $idx (footage/animated, no still needed)"; continue
    fi
    art=$(jq -r '.art // empty' <<<"$s")
    artpath=""
    [[ -n "$art" ]] && artpath="$ART_DIR/$art.jpg"

    spec="$WORK/spec-$idx.json"
    if [[ "$RENDERER" == "storyboard" ]]; then
      jq --arg panel "$((10#$idx))" '
        {template: (.template // "sketch"),
         draw: (.draw // null), phase: (.phase // null),
         kicker: (.kicker // null), text: (.text // null),
         accent: (.accent // null), sub: (.sub // null),
         panel: (.panel // $panel)}
      ' <<<"$s" > "$spec"
    else
      jq --arg art "$artpath" '
        {template: (.template // (if .art then "lower-third" else "title" end)),
         art: $art, focus: (.focus // "center"), scrim: (.scrim // 0.28),
         kicker: (.kicker // null), title: (.text // null), sub: (.sub // null),
         stat: (.stat // null), titleSize: (.titleSize // null)}
      ' <<<"$s" > "$spec"
    fi

    node "$WORK/render-scene.mjs" --spec "$spec" --out "$WORK/stills/$idx.raw.png" >/dev/null

    doodles=$(jq -c '.doodles // empty' <<<"$s")
    if [[ -n "$doodles" ]]; then
      jq -n --argjson marks "$doodles" --argjson seed "$((10#$idx))" \
        --argjson w "$W" --argjson h "$H" \
        '{width:$w, height:$h, color:"#c8452a", seed:$seed, marks:$marks}' > "$WORK/doodles-$idx.json"
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
    [[ -s "$WORK/audio/$idx.wav" ]]  || { echo "  ✗ $idx — no audio (run: tts --scene $idx)"; continue; }

    s=$(scene_json "$idx")
    motion=$(jq -r '.motion // "in"' <<<"$s")
    adur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/audio/$idx.wav")
    dur=$(python3 -c "print(round(float('$adur') + 0.7, 3))")

    # --- three ways a scene can be built ---------------------------------
    #   footage  : a stock clip from assets/clips/<slug>/<footage>.mp4, trimmed/looped
    #   animate  : N keyframes from render-frames.tsx, interpolated by keyframes2clip.sh
    #   still    : one Takumi still, Ken Burns motion (the original path)
    footage=$(jq -r '.footage // empty' <<<"$s")
    animate=$(jq -r '.animate // empty' <<<"$s")

    if [[ -n "$footage" ]]; then
      src="$ROOT/assets/clips/$SLUG/$footage.mp4"
      [[ -s "$src" ]] || { echo "  ✗ $idx — no footage $footage (run: stock-fetch)"; continue; }

      # type overlay: rendered once per scene, composited over the moving footage
      ovl="$WORK/stills/$idx.ovl.png"
      if [[ "$FORCE" -eq 1 || ! -s "$ovl" ]]; then
        jq --arg panel "$((10#$idx))" '
          {kicker:(.kicker // null), text:(.text // null),
           accent:(.accent // null), sub:(.sub // null), panel:$panel}
        ' <<<"$s" > "$WORK/overlay-$idx.json"
        node "$WORK/render-overlay.mjs" --spec "$WORK/overlay-$idx.json" --out "$ovl" --w "$W" --h "$H" >/dev/null 2>&1 \
          || { echo "  ✗ $idx — overlay render failed"; continue; }
      fi

      # loop the source if the narration runs longer than the clip; cover-crop to frame
      ffmpeg -y -hide_banner -loglevel error \
        -stream_loop -1 -i "$src" -i "$ovl" -t "$dur" \
        -filter_complex "[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=$FPS[bg];[bg][1:v]overlay=0:0:format=auto,format=yuv420p" \
        -an -c:v libx264 -preset veryfast -crf 19 "$out"
      printf '  ✓ %s  %.1fs  [footage:%s]\n' "$idx" "$dur" "$footage"
      continue
    fi

    if [[ -n "$animate" ]]; then
      fdir="$WORK/frames/$idx"
      nframes=$(jq -r '.frames // 18' <<<"$s")
      rm -rf "$fdir"; mkdir -p "$fdir"
      jq --arg panel "$((10#$idx))" '
        {template:"anim", animate:(.animate), kicker:(.kicker // null),
         text:(.text // null), accent:(.accent // null), sub:(.sub // null), panel:$panel}
      ' <<<"$s" > "$WORK/frame-$idx.json"
      node "$WORK/render-frames.mjs" --spec "$WORK/frame-$idx.json" --outdir "$fdir" \
        --n "$nframes" --w "$W" --h "$H" >/dev/null 2>&1
      "$ROOT/scripts/keyframes2clip.sh" "$fdir" "$dur" "$out" "$(jq -r '.animMode // "blend"' <<<"$s")" "$FPS" "$W" "$H"
      continue
    fi

    [[ -s "$WORK/stills/$idx.png" ]] || { echo "  ✗ $idx — no still (run: still --scene $idx)"; continue; }
    # overscan so zoompan has room to move; scale on the larger axis
    over=$(python3 -c "print($W * 2 if $W > $H else $H * 2)")
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
      -vf "scale=${over}:-2,zoompan=z='$z':x='$x':y='$y':d=$frames:s=${W}x${H}:fps=$FPS,format=yuv420p" \
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

  # Build the xfade chain. Each xfade needs BOTH inputs to still have frames at
  # the offset; if a short clip runs out, ffmpeg silently truncates the output.
  # So every input is first padded to its full slot length (clip + one crossfade),
  # which guarantees frames exist where the offset lands.
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

parts = []
# pad each source so it can always supply frames through its crossfade
for k in range(n):
    parts.append(f"[{k}:v]tpad=stop_mode=clone:stop_duration={xf + 0.5:.3f},setsar=1[p{k}]")

cur, total = "[p0]", 0.0
for k in range(1, n):
    total += durs[k-1] - xf
    nxt = f"[v{k}]" if k < n - 1 else "[vout]"
    parts.append(f"{cur}[p{k}]xfade=transition=fadeblack:duration={xf}:offset={total:.3f}{nxt}")
    cur = f"[v{k}]"
print(";".join(parts))
PY

  # exact merged length: sum of clips minus one crossfade per join
  local total
  total=$(python3 - "$n" "$XFADE" "$WORK/clips" <<'PY'
import sys, subprocess, json, os
n, xf = int(sys.argv[1]), float(sys.argv[2])
folder = sys.argv[3]
s = 0.0
for k in range(1, n + 1):
    p = os.path.join(folder, f"{k:02d}.mp4")
    out = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","json",p],
                         capture_output=True, text=True).stdout
    s += float(json.loads(out)["format"]["duration"])
print(f"{s - (n - 1) * xf:.3f}")
PY
)

  ffmpeg -y -hide_banner -loglevel error "${inputs[@]}" \
    -filter_complex_script "$WORK/merge-filter.txt" \
    -map "[vout]" -t "$total" -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p "$WORK/video.mp4"
  echo "  ✓ $WORK/video.mp4 (${total}s)"
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

  # Hinglish subtitles: built from scenes.json "sub" lines against real clip timings,
  # burned in after the mix so they survive the encode. Toggle with subtitles:false.
  local subs=0 subfile="$WORK/subs.srt" subvf=""
  if [[ "$(jq -r '.subtitles // true' "$EP_JSON" 2>/dev/null)" != "false" ]]; then
    python3 "$ROOT/scripts/make-srt.py" "$SCENES" "$WORK" "$XFADE" "$subfile" >/dev/null 2>&1 \
      && subs=1 && echo "  + subtitles (Hinglish)"
  fi
  if [[ "$subs" -eq 1 ]]; then
    # keep captions below the title block; on 16:9 that's a fixed inset from the bottom
    local fs=$(( W / 40 ))
    local bottom=$(( H / 22 ))
    subvf="subtitles='${subfile}':force_style='FontName=Poppins,FontSize=${fs},Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,BackColour=&HB4000000,MarginV=${bottom},Alignment=2'"
  fi

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
      -map 0:v -map "[afinal]" -vf "${subvf:-null}" \
      -c:v libx264 -preset veryfast -crf 19 -c:a aac -b:a 160k -movflags +faststart \
      -t "$dur" "$OUT"
  else
    ffmpeg -y -hide_banner -loglevel error \
      -i "$WORK/video.mp4" "${audio[@]}" \
      -filter_complex_script "$WORK/audio-filter.txt" \
      -map 0:v -map "[anarr]" -vf "${subvf:-null}" \
      -c:v libx264 -preset veryfast -crf 19 -c:a aac -b:a 160k -movflags +faststart \
      -shortest "$OUT"
  fi
  echo "  ✓ $OUT"
}

step_upload() {
  echo "▶ upload"
  [[ -s "$OUT" ]] || { echo "  ✗ nothing to upload (run: audio)"; return 1; }

  # Telegram first when configured — it reaches the phone directly and never expires
  local env_file="${HOME}/.config/meowscrada/env"
  if [[ -f "$env_file" ]]; then
    # parse KEY=value without `source` — sourcing with `set -a` exports every
    # loop variable in the script and breaks later loops
    while IFS='=' read -r k v; do
      [[ -z "$k" || "$k" == \#* ]] && continue
      v="${v%\"}"; v="${v#\"}"
      printf -v "$k" '%s' "$v"
      export "$k"
    done < "$env_file"
  fi
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    local caption
    caption=$(jq -r '.title // empty' "$EP_JSON" 2>/dev/null)
    [[ -n "$caption" ]] || caption="$SLUG"
    local staged="$ROOT/.temp/$SLUG-final.mp4"
    cp "$OUT" "$staged"
    "$ROOT/scripts/telegram-send.sh" "$staged" "$caption" && return 0
    echo "  · telegram failed, falling back to tmpfiles"
  fi

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
