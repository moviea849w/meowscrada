#!/usr/bin/env bash
# tg-poll.sh — collect new Telegram messages for the bot
#
# The bot API is pull-only: nothing arrives unless something asks. This script
# long-polls getUpdates and appends every new message to a log the agent reads.
#
# Usage:
#   ./scripts/tg-poll.sh            # poll forever (background it)
#   ./scripts/tg-poll.sh --once     # drain pending messages and exit
#   ./scripts/tg-poll.sh --read     # print the log
#
# The offset is kept in .temp/tg-offset so messages are never re-read or lost.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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
[[ -n "$TOKEN" ]] || { echo "✗ no TELEGRAM_BOT_TOKEN"; exit 1; }

LOG="$ROOT/.temp/telegram-inbox.log"
OFFSET_FILE="$ROOT/.temp/tg-offset"
mkdir -p "$ROOT/.temp"

if [[ "${1:-}" == "--read" ]]; then
  [[ -f "$LOG" ]] && cat "$LOG" || echo "(inbox empty)"
  exit 0
fi

fetch() {
  local timeout="${1:-0}"
  local offset=0
  [[ -f "$OFFSET_FILE" ]] && offset=$(cat "$OFFSET_FILE")
  local resp
  resp=$(curl -s --max-time $(( timeout + 10 )) \
    "https://api.telegram.org/bot$TOKEN/getUpdates?offset=$offset&timeout=$timeout")
  [[ "$(jq -r '.ok' <<<"$resp" 2>/dev/null)" == "true" ]] || return 0

  local count
  count=$(jq '.result | length' <<<"$resp")
  [[ "$count" -eq 0 ]] && return 0

  jq -r '.result[] | select(.message != null) |
    "[\(.message.date | strftime("%Y-%m-%d %H:%M"))] \(.message.chat.id) @\(.message.chat.username // "?"): \(.message.text // .message.caption // "(" + (if .message.video then "video" elif .message.photo then "photo" elif .message.document then "file" else "media" end) + ")")"' \
    <<<"$resp" >> "$LOG"

  local last
  last=$(jq -r '[.result[].update_id] | max' <<<"$resp")
  echo $(( last + 1 )) > "$OFFSET_FILE"
  jq -r '.result[] | select(.message != null) | "  · \(.message.text // "(media)")"' <<<"$resp"
}

if [[ "${1:-}" == "--once" ]]; then
  fetch 0
  exit 0
fi

echo "▶ polling Telegram (log: $LOG)"
while true; do
  fetch 25
  sleep 1
done
