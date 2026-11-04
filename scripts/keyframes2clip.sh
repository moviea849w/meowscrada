#!/usr/bin/env bash
# keyframes2clip.sh — turn a keyframe sequence into a smooth clip
#
# render-frames.tsx draws N keyframes per scene. This interpolates them into
# video at the target fps. Two modes:
#
#   minterpolate  — optical-flow interpolation; genuinely smooth motion, slower.
#                   Best for shapes that move continuously (waves, growing bars).
#   blend         — crossfades between keyframes; fast and reliable.
#                   Best for anything with text, which minterpolate smears.
#
# Usage:
#   ./scripts/keyframes2clip.sh FRAMEDIR DURATION OUT.mp4 [minterpolate|blend] [fps] [W] [H]
#
# Example:
#   ./scripts/keyframes2clip.sh .temp/ep/frames/03 6.2 out/03.mp4 blend 30 1920 1080

set -uo pipefail

FRAMES="${1:?usage: keyframes2clip.sh FRAMEDIR DURATION OUT [mode] [fps] [W] [H]}"
DUR="${2:?duration in seconds}"
OUT="${3:?output path}"
MODE="${4:-blend}"
FPS="${5:-30}"
W="${6:-1920}"
H="${7:-1080}"

N=$(ls "$FRAMES"/*.png 2>/dev/null | wc -l)
[[ "$N" -ge 1 ]] || { echo "✗ no frames in $FRAMES"; exit 1; }

# keyframe rate: how many stills per second of output
KPS=$(python3 -c "print(round($N / max($DUR, 0.1), 4))")

mkdir -p "$(dirname "$OUT")"

if [[ "$MODE" == "minterpolate" ]]; then
  # flow-based: interpolate up to the output fps
  ffmpeg -y -hide_banner -loglevel error \
    -framerate "$KPS" -i "$FRAMES/%03d.png" \
    -vf "scale=${W}:${H},fps=${FPS},minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,format=yuv420p" \
    -t "$DUR" -r "$FPS" -c:v libx264 -preset veryfast -crf 18 "$OUT"
else
  # blend: keep native keyframe rate, crossfade between consecutive frames,
  # then retime to the target fps. Cheap and text-safe.
  FRAMES_N=$(( N - 1 ))
  [[ "$FRAMES_N" -lt 1 ]] && FRAMES_N=1
  ffmpeg -y -hide_banner -loglevel error \
    -framerate "$KPS" -i "$FRAMES/%03d.png" \
    -vf "scale=${W}:${H},framerate=fps=${FPS},format=yuv420p" \
    -t "$DUR" -r "$FPS" -c:v libx264 -preset veryfast -crf 18 "$OUT"
fi

printf '  ✓ %s (%s, %d keyframes, %.2f kps, %.1fs)\n' "$OUT" "$MODE" "$N" "$KPS" "$DUR"
