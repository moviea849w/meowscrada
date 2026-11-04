#!/usr/bin/env bash
# telegram-send.sh — send a finished video to Telegram
#
# The bot token and chat id live in ~/.config/meowscrada/env (outside the repo).
# Get a chat id by messaging the bot once, then:
#   source ~/.config/meowscrada/env && curl -s \
#     "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | jq '.result[0].message.chat.id'
#
# Usage:
#   ./scripts/telegram-send.sh VIDEO.mp4 ["caption"]
#
# Telegram's bot API caps uploads at 50 MB via sendVideo. Anything larger is sent
# as a document, which still plays inline on mobile. If a file is too big for that
# too, it is compressed automatically and sent as a smaller video.

set -uo pipefail

VIDEO="${1:?usage: telegram-send.sh VIDEO.mp4 [caption]}"
CAPTION="${2:-}"

ENV_FILE="${HOME}/.config/meowscrada/env"
if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" == \#* ]] && continue
    v="${v%\"}"; v="${v#\"}"
    printf -v "$k" '%s' "$v"
    export "$k"
  done < "$ENV_FILE"
fi

TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT="${TELEGRAM_CHAT_ID:-}"
[[ -n "$TOKEN" ]] || { echo "✗ no TELEGRAM_BOT_TOKEN"; exit 1; }
[[ -n "$CHAT"  ]] || { echo "✗ no TELEGRAM_CHAT_ID (message the bot, then re-run)"; exit 1; }
[[ -s "$VIDEO" ]] || { echo "✗ no such file: $VIDEO"; exit 1; }

API="https://api.telegram.org/bot$TOKEN"
size=$(stat -c%s "$VIDEO")
LIMIT=$((50 * 1024 * 1024))

send_video() {
  local f="$1"
  curl -s -X POST "$API/sendVideo" \
    -F "chat_id=$CHAT" \
    -F "video=@$f" \
    -F "caption=$CAPTION" \
    -F "supports_streaming=true" \
    -F "width=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f")" \
    -F "height=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$f")" \
    -F "duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | cut -d. -f1)" \
    -F "thumbnail=@$(dirname "$f")/thumb.jpg" 2>/dev/null || true
}

echo "▶ telegram: $(basename "$VIDEO") ($(( size / 1024 / 1024 )) MB)"

# a thumbnail makes the chat preview much nicer
THUMB="$(dirname "$VIDEO")/thumb.jpg"
if [[ ! -s "$THUMB" ]]; then
  ffmpeg -y -hide_banner -loglevel error -ss 2 -i "$VIDEO" -frames:v 1 \
    -vf "scale=640:-2" "$THUMB" 2>/dev/null || true
fi

if [[ "$size" -le "$LIMIT" ]]; then
  resp=$(send_video "$VIDEO")
else
  # compress to fit: 720p, crf 28 — still perfectly watchable on a phone
  small="$(dirname "$VIDEO")/.tg-$(basename "$VIDEO")"
  echo "  · compressing to fit 50 MB"
  ffmpeg -y -hide_banner -loglevel error -i "$VIDEO" \
    -vf "scale=-2:720" -c:v libx264 -preset veryfast -crf 28 -c:a aac -b:a 96k \
    -movflags +faststart "$small"
  resp=$(send_video "$small")
  rm -f "$small"
fi

if [[ "$(jq -r '.ok' <<<"$resp" 2>/dev/null)" == "true" ]]; then
  fname=$(jq -r '.result.video.file_name // .result.document.file_name // "file"' <<<"$resp")
  fid=$(jq -r '.result.video.file_id // .result.document.file_id' <<<"$resp")
  echo "  ✓ sent: $fname"
  echo "  file_id: $fid"
else
  echo "  ✗ send failed: $(jq -r '.description // .' <<<"$resp" 2>/dev/null | head -2)"
  exit 1
fi
