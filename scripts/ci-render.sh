#!/usr/bin/env bash
# ci-render.sh — one entry point that renders an episode end to end.
#
# This is what GitHub Actions runs. It is deliberately dumb: fetch what is
# missing, render, mix, send to Telegram. Everything it needs comes from
# arguments or environment, never from a hardcoded path.
#
# Usage:
#   ./scripts/ci-render.sh <episode-slug> [--from STEP] [--to STEP] [--no-send]
#
# Example:
#   ./scripts/ci-render.sh 003-never-sleep
#   ./scripts/ci-render.sh 003-never-sleep --from clip --to upload
#
# Environment (CI provides these as secrets):
#   TELEGRAM_BOT_TOKEN   bot token
#   TELEGRAM_CHAT_ID     chat or group id to post the video into
#   PEXELS_API_KEY       optional; needed only if footage must be downloaded
#
# Steps run in order: stock → tts → still → clip → merge → audio → upload
# A step whose outputs already exist is skipped, so CI resumes cheaply.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SLUG="${1:-}"
[[ -n "$SLUG" && "$SLUG" != --* ]] || {
  echo "usage: ci-render.sh <episode-slug> [--from STEP] [--to STEP] [--no-send]"
  exit 1
}
shift || true

FROM="stock"
TO="upload"
SEND=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from) FROM="$2"; shift 2 ;;
    --to)   TO="$2";   shift 2 ;;
    --no-send) SEND=0; shift ;;
    *) echo "! unknown flag: $1"; exit 1 ;;
  esac
done

EP_DIR="$ROOT/episodes/$SLUG"
[[ -d "$EP_DIR" ]] || { echo "✗ no such episode: $SLUG"; exit 1; }

echo "══════════════════════════════════════════"
echo " episode : $SLUG"
echo " steps   : $FROM → $TO"
echo " cores   : $(nproc)   mem: $(free -g | awk 'NR==2{print $2}')G"
echo "══════════════════════════════════════════"

# --- dependency check -------------------------------------------------------
need=()
command -v ffmpeg  >/dev/null || need+=(ffmpeg)
command -v node    >/dev/null || need+=(node)
command -v jq      >/dev/null || need+=(jq)
command -v python3 >/dev/null || need+=(python3)
if [[ ${#need[@]} -gt 0 ]]; then
  echo "✗ missing: ${need[*]}"
  exit 1
fi

# --- tools that the pipeline expects but CI must install --------------------
if [[ ! -x "$ROOT/scripts/tts" ]]; then
  echo "✗ scripts/tts missing"
  exit 1
fi

# voice models are not in the repo (too large) — fetch on demand
VOICE_DIR="${HOME}/.local/share/piper-voices"
VOICE_LANG=$(jq -r '.voice // "hi"' "$EP_DIR/episode.json" 2>/dev/null)
VOICE_NAME=$(jq -r '.voiceName // empty' "$EP_DIR/episode.json" 2>/dev/null)
if [[ ! -d "$VOICE_DIR" || -z "$(ls -A "$VOICE_DIR" 2>/dev/null)" ]]; then
  echo "▶ fetching piper voice models"
  bash "$ROOT/scripts/voice-fetch.sh" || {
    echo "✗ could not fetch voice models (see scripts/voice-fetch.sh)"
    exit 1
  }
fi

# --- steps ------------------------------------------------------------------
steps=(stock tts still clip merge audio upload)
started=0
for step in "${steps[@]}"; do
  [[ "$step" == "$FROM" ]] && started=1
  [[ "$started" -eq 0 ]] && continue

  case "$step" in
    stock)
      if [[ -f "$EP_DIR/clips.json" ]]; then
        echo "▶ stock"
        if [[ -n "$(ls -A "$ROOT/assets/clips/$SLUG" 2>/dev/null | grep -v credits.json || true)" ]]; then
          echo "  · cached"
        else
          "$ROOT/scripts/stock-fetch.sh" "$EP_DIR/clips.json" "$ROOT/assets/clips/$SLUG"
        fi
      fi
      ;;
    upload)
      if [[ "$SEND" -eq 0 ]]; then echo "▶ upload (skipped)"; else
        "$ROOT/scripts/pipeline.sh" upload "$SLUG"
      fi
      ;;
    *)
      "$ROOT/scripts/pipeline.sh" "$step" "$SLUG" || {
        echo "✗ step failed: $step"
        exit 1
      }
      ;;
  esac

  [[ "$step" == "$TO" ]] && break
done

echo "══════════════════════════════════════════"
[[ -s "$ROOT/.temp/$SLUG/final.mp4" ]] && {
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$ROOT/.temp/$SLUG/final.mp4")
  size=$(stat -c%s "$ROOT/.temp/$SLUG/final.mp4")
  echo " ✓ $SLUG  ${dur}s  $((size/1024/1024))MB"
}
echo "══════════════════════════════════════════"
