#!/usr/bin/env bash
# voice-fetch.sh — download Piper voice models on demand.
#
# The .onnx models are ~60-100 MB each, so they are NOT committed. Local machines
# keep them in ~/.local/share/piper-voices; CI fetches them on every run (cached
# by actions/cache when possible).
#
# Usage:
#   ./scripts/voice-fetch.sh                 # the three voices the pipeline uses
#   ./scripts/voice-fetch.sh en_US-ryan-high # just one
#
# Models come from the piper-voices HuggingFace mirror.

set -uo pipefail

DEST="${HOME}/.local/share/piper-voices"
mkdir -p "$DEST"

BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main"

declare -A PATHS=(
  [en_US-lessac-medium]="en/en_US/lessac/medium/en_US-lessac-medium"
  [en_US-ryan-high]="en/en_US/ryan/high/en_US-ryan-high"
  [hi_IN-pratham-medium]="hi/hi_IN/pratham/medium/hi_IN-pratham-medium"
)

want=("$@")
[[ ${#want[@]} -eq 0 ]] && want=(en_US-lessac-medium en_US-ryan-high hi_IN-pratham-medium)

for v in "${want[@]}"; do
  p="${PATHS[$v]:-}"
  [[ -n "$p" ]] || { echo "  ! unknown voice: $v"; continue; }

  if [[ -s "$DEST/$v.onnx" && -s "$DEST/$v.onnx.json" ]]; then
    echo "  · $v cached"
    continue
  fi

  echo "  ↓ $v"
  curl -sL --retry 3 -o "$DEST/$v.onnx"      "$BASE/$p.onnx"      || { echo "  ✗ model"; continue; }
  curl -sL --retry 3 -o "$DEST/$v.onnx.json" "$BASE/$p.onnx.json" || { echo "  ✗ config"; continue; }

  # a truncated download is worse than none — check the size
  sz=$(stat -c%s "$DEST/$v.onnx" 2>/dev/null || echo 0)
  if [[ "$sz" -lt 1000000 ]]; then
    echo "  ✗ $v looks truncated ($sz bytes)"
    rm -f "$DEST/$v.onnx"
    continue
  fi
  echo "  ✓ $v ($(( sz / 1024 / 1024 )) MB)"
done
