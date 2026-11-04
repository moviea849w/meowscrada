#!/usr/bin/env bash
# audio-fetch.sh — build the background-music and SFX library from Openverse
#
# Openverse (api.openverse.org) indexes CC-licensed audio from Freesound, Jamendo,
# Wikimedia and more. No API key needed.
#
# License policy for this channel (monetised YouTube): **cc0 and by only**.
# NC (non-commercial) and ND (no-derivatives) are rejected — we cut and remix audio,
# and the channel earns money.
#
# Usage:
#   ./scripts/audio-fetch.sh music    assets/music/music.json    assets/music
#   ./scripts/audio-fetch.sh sfx      assets/sfx/sfx.json        assets/sfx
#
# Input JSON is an array of search requests:
#   { "key": "medieval-ambient", "query": "medieval ambient", "minDuration": 60, "pick": 0 }
#   { "key": "whoosh",           "query": "whoosh transition", "maxDuration": 5 }
#
# Output:
#   <outdir>/<key>.mp3      normalized, loudness-flattened where possible
#   <outdir>/credits.json   title, creator, license, provider, source URL

set -uo pipefail

KIND="${1:?usage: audio-fetch.sh music|sfx REQUEST_JSON OUTDIR}"
REQ_JSON="${2:?usage: audio-fetch.sh music|sfx REQUEST_JSON OUTDIR}"
OUTDIR="${3:?usage: audio-fetch.sh music|sfx REQUEST_JSON OUTDIR}"
mkdir -p "$OUTDIR"

API="https://api.openverse.org/v1/audio/"
UA="meowscrada-video/1.0 (educational; github.com/moviea849w/meowscrada)"
[[ -f "$OUTDIR/credits.json" ]] || echo '{}' > "$OUTDIR/credits.json"

COUNT=$(jq 'length' "$REQ_JSON")
echo "▶ $KIND: $COUNT requests → $OUTDIR"

for i in $(seq 0 $((COUNT - 1))); do
  req=$(jq -c ".[$i]" "$REQ_JSON")
  key=$(jq -r '.key' <<<"$req")
  query=$(jq -r '.query' <<<"$req")
  pick=$(jq -r '.pick // 0' <<<"$req")
  min_d=$(jq -r '.minDuration // 0' <<<"$req")
  max_d=$(jq -r '.maxDuration // 999999' <<<"$req")

  resp=$(curl -s -m 60 -A "$UA" \
    "${API}?q=$(jq -rn --arg v "$query" '$v|@uri')&page_size=20&license=cc0,by&audio=true")

  # filter: license allowlist, duration window, direct file url present
  # NOTE: Openverse reports duration in MILLISECONDS. Normalize to seconds.
  sel=$(jq -c --argjson p "$pick" --argjson lo "$min_d" --argjson hi "$max_d" '
    [.results[]?
     | .durSec = ((.duration // 0) / 1000)
     | select(.license == "cc0" or .license == "by")
     | select(.durSec >= $lo and .durSec <= $hi)
     | select(.url != null and (.url | test("\\.(mp3|ogg|wav|flac)(\\?|$)"; "i")))]
    | .[$p] // empty' <<<"$resp")

  if [[ -z "$sel" || "$sel" == "null" ]]; then
    echo "  ✗ $key — no cc0/by match for \"$query\""
    continue
  fi

  url=$(jq -r '.url' <<<"$sel")
  ext="${url%%\?*}"; ext="${ext##*.}"
  ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')

  raw="$OUTDIR/.raw-$key.$ext"
  if ! curl -sL -m 180 -A "$UA" -o "$raw" "$url"; then
    echo "  ✗ $key — download failed"
    rm -f "$raw"; continue
  fi
  if [[ ! -s "$raw" ]] || ! ffprobe -v error -show_entries format=duration -of csv=p=0 "$raw" >/dev/null 2>&1; then
    echo "  ✗ $key — not decodable"
    rm -f "$raw"; continue
  fi

  # normalize to mp3, strip metadata, tame loudness so mixes are even
  if [[ "$KIND" == "music" ]]; then
    af="loudnorm=I=-20:TP=-2:LRA=11"
  else
    af="loudnorm=I=-16:TP=-1:LRA=7"
  fi

  ffmpeg -y -hide_banner -loglevel error -i "$raw" -vn \
    -af "$af" -ar 44100 -ac 2 -map_metadata -1 -q:a 4 "$OUTDIR/$key.mp3" 2>/dev/null \
    || ffmpeg -y -hide_banner -loglevel error -i "$raw" -vn \
         -ar 44100 -ac 2 -map_metadata -1 -q:a 4 "$OUTDIR/$key.mp3"
  rm -f "$raw"

  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTDIR/$key.mp3" | cut -d. -f1)
  jq --arg k "$key" --argjson s "$sel" --arg d "$dur" \
    '. + {($k): {title:$s.title, creator:$s.creator, license:$s.license, provider:$s.provider, page:$s.foreign_landing_url, duration:$d}}' \
    "$OUTDIR/credits.json" > "$OUTDIR/credits.json.tmp" && mv "$OUTDIR/credits.json.tmp" "$OUTDIR/credits.json"

  printf '  ✓ %-22s %4ss  %-4s %-10s %s\n' "$key" "$dur" "$(jq -r '.license' <<<"$sel")" "$(jq -r '.provider' <<<"$sel")" "$(jq -r '.title' <<<"$sel" | cut -c1-44)"
done

echo "✓ credits: $OUTDIR/credits.json"
