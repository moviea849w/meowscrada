#!/usr/bin/env bash
# quick-preview.sh — render an episode at low resolution, fast, for review
#
# Reuses the cached clips and narration, merges at 144p and muxes the audio.
# A 4-minute episode finishes in seconds instead of minutes.
#
# Usage:
#   ./scripts/quick-preview.sh <slug> [height] [out.mp4]

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SLUG="${1:?usage: quick-preview.sh <slug> [height] [out]}"
H="${2:-144}"
OUT="${3:-$ROOT/.temp/$SLUG/preview-${H}p.mp4}"
WORK="$ROOT/.temp/$SLUG"
XF=0.8

[[ -d "$WORK/clips" ]] || { echo "✗ no clips for $SLUG"; exit 1; }
mkdir -p "$(dirname "$OUT")"

mapfile -t CLIPS < <(ls "$WORK/clips"/*.mp4 | sort)
N=${#CLIPS[@]}
echo "▶ preview: $N clips -> ${H}p"

# merge + scale down in one ffmpeg pass
ARGS=()
for f in "${CLIPS[@]}"; do ARGS+=(-i "$f"); done

python3 - "$N" "$XF" "$WORK/clips" > "$WORK/preview-filter.txt" <<'PY'
import sys, subprocess, json, os
n, xf = int(sys.argv[1]), float(sys.argv[2])
folder = sys.argv[3]
durs = []
for k in range(1, n + 1):
    p = os.path.join(folder, f"{k:02d}.mp4")
    o = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","json",p],
                       capture_output=True, text=True).stdout
    durs.append(float(json.loads(o)["format"]["duration"]))
parts = [f"[{k}:v]tpad=stop_mode=clone:stop_duration={xf+0.5:.3f},setsar=1[p{k}]" for k in range(n)]
cur, total = "[p0]", 0.0
for k in range(1, n):
    total += durs[k-1] - xf
    nxt = f"[v{k}]" if k < n - 1 else "[vout]"
    parts.append(f"{cur}[p{k}]xfade=transition=fadeblack:duration={xf}:offset={total:.3f}{nxt}")
    cur = f"[v{k}]"
print(";".join(parts))
print(f"#TOTAL {total:.3f}", file=sys.stderr)
PY

TOTAL=$(python3 - "$N" "$XF" "$WORK/clips" <<'PY'
import sys, subprocess, json, os
n, xf = int(sys.argv[1]), float(sys.argv[2]); folder = sys.argv[3]
s = 0.0
for k in range(1, n+1):
    p = os.path.join(folder, f"{k:02d}.mp4")
    o = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","json",p],
                       capture_output=True, text=True).stdout
    s += float(json.loads(o)["format"]["duration"])
print(f"{s - (n-1)*xf:.3f}")
PY
)

# narration: place each line on the merged timeline, in the SAME filter graph
AUD=()
for ((k=1; k<=N; k++)); do AUD+=(-i "$WORK/audio/$(printf '%02d' $k).wav"); done

python3 - "$N" "$XF" "$WORK/clips" "$H" > "$WORK/preview-all.txt" <<'PY'
import sys, subprocess, json, os
n, xf, folder, H = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3], int(sys.argv[4])
durs=[]
for k in range(1,n+1):
    p=os.path.join(folder,f"{k:02d}.mp4")
    o=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","json",p],capture_output=True,text=True).stdout
    durs.append(float(json.loads(o)["format"]["duration"]))

parts=[f"[{k}:v]scale=-2:{H},tpad=stop_mode=clone:stop_duration={xf+0.5:.3f},setsar=1[p{k}]" for k in range(n)]
cur,total="[p0]",0.0
for k in range(1,n):
    total+=durs[k-1]-xf
    nxt=f"[v{k}]" if k<n-1 else "[vm]"
    parts.append(f"{cur}[p{k}]xfade=transition=fadeblack:duration={xf}:offset={total:.3f}{nxt}")
    cur=f"[v{k}]"

starts,t=[],0.0
for k in range(n):
    starts.append(t); t+=durs[k]-xf
# audio inputs are indexed after the n video inputs
for k in range(n):
    parts.append(f"[{n+k}:a]adelay={int(round(starts[k]*1000))}|{int(round(starts[k]*1000))}[a{k}]")
mix="".join(f"[a{k}]" for k in range(n))
parts.append(f"{mix}amix=inputs={n}:duration=longest:normalize=0,alimiter=limit=0.89:level=false,aresample=48000[an]")
print(";".join(parts))
PY

ffmpeg -y -hide_banner -loglevel error "${ARGS[@]}" "${AUD[@]}" \
  -filter_complex_script "$WORK/preview-all.txt" \
  -map "[vm]" -map "[an]" \
  -t "$TOTAL" -c:v libx264 -preset ultrafast -crf 32 \
  -c:a aac -b:a 64k -movflags +faststart "$OUT"

echo "✓ $OUT ($(du -h "$OUT" | cut -f1), ${TOTAL}s)"
