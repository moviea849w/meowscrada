#!/usr/bin/env bash
# stock-fetch.sh — fetch real stock footage from Pexels (and Pixabay if a key exists)
#
# Pexels and Pixabay both give free API keys. Keys are read from, in order:
#   1. the environment        (PEXELS_API_KEY / PIXABAY_API_KEY)
#   2. ~/.config/meowscrada/env   (KEY=value lines, outside the repo — never committed)
#
# Clips are transcoded to a uniform 1920x1080 H.264 with no audio, so they drop
# straight into the pipeline.
#
# Usage:
#   ./scripts/stock-fetch.sh episodes/003-never-sleep/clips.json assets/clips/003-never-sleep
#
# clips.json is an array:
#   { "key": "sleeping",  "query": "person sleeping bed", "duration": 6 }
#   { "key": "night",     "query": "driving night road",  "pick": 2, "duration": 5 }
#   { "key": "id:5425721" }                       # a specific Pexels video id
#
# Per entry:
#   key        output name (-> <key>.mp4)
#   query      search terms (Pexels; falls back to Pixabay)
#   id         exact Pexels video id (most reliable)
#   pick       0-based index among results (default 0)
#   orientation  landscape | portrait | square  (default landscape)
#   start      seconds to start the cut at (default 0)
#   duration   seconds to keep (default 6)
#
# Output:
#   <outdir>/<key>.mp4       1920x1080, 30 fps, no audio
#   <outdir>/credits.json    id, author, license, page URL per key
#
# Existing files are kept unless FORCE_REFETCH=1.

set -uo pipefail

CLIPS_JSON="${1:?usage: stock-fetch.sh CLIPS_JSON OUTDIR}"
OUTDIR="${2:?usage: stock-fetch.sh CLIPS_JSON OUTDIR}"
mkdir -p "$OUTDIR"

ENV_FILE="${HOME}/.config/meowscrada/env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

PEXELS_KEY="${PEXELS_API_KEY:-}"
PIXABAY_KEY="${PIXABAY_API_KEY:-}"
[[ -n "$PEXELS_KEY$PIXABAY_KEY" ]] || {
  echo "✗ no stock API key."
  echo "  put PEXELS_API_KEY=... in ~/.config/meowscrada/env (free key: pexels.com/api)"
  exit 1
}

CREDITS="$OUTDIR/credits.json"
[[ -f "$CREDITS" ]] || echo '{}' > "$CREDITS"

W=1920; H=1080; FPS=30
log() { echo "  $*"; }

# pick the best mp4 link at or above 1080p, else the largest available
pick_link() {
  python3 - <<'PY'
import sys, json
d = json.load(sys.stdin)
files = [f for f in d.get("video_files", []) if f.get("file_type") == "video/mp4" and f.get("link")]
files.sort(key=lambda f: (f.get("width") or 0) * (f.get("height") or 0))
big = [f for f in files if (f.get("width") or 0) >= 1920 and (f.get("height") or 0) >= 1080]
chosen = big[0] if big else (files[-1] if files else None)
if not chosen:
    sys.exit(1)
print("\t".join([chosen["link"], str(d.get("id", "")),
                 d.get("user", {}).get("name", ""), d.get("url", "")]))
PY
}

pexels_lookup() {
  local entry="$1"
  local id query pick orient url body
  id=$(jq -r '.id // empty' <<<"$entry")
  query=$(jq -r '.query // empty' <<<"$entry")
  pick=$(jq -r '.pick // 0' <<<"$entry")
  orient=$(jq -r '.orientation // "landscape"' <<<"$entry")

  # NOTE: the JSON is passed as an argv element, not on stdin — a heredoc would
  # occupy stdin and the pipe would be discarded.
  if [[ -n "$id" ]]; then
    body=$(curl -s -H "Authorization: $PEXELS_KEY" "https://api.pexels.com/videos/videos/$id")
    python3 -c '
import sys, json
d = json.loads(sys.argv[1])
files = [f for f in d.get("video_files", []) if f.get("file_type") == "video/mp4" and f.get("link")]
files.sort(key=lambda f: (f.get("width") or 0) * (f.get("height") or 0))
big = [f for f in files if (f.get("width") or 0) >= 1920 and (f.get("height") or 0) >= 1080]
c = big[0] if big else (files[-1] if files else None)
if not c: sys.exit(1)
print("\t".join([c["link"], str(d.get("id","")), d.get("user",{}).get("name",""), d.get("url","")]))
' "$body"
  elif [[ -n "$query" ]]; then
    body=$(curl -s -H "Authorization: $PEXELS_KEY" \
      "https://api.pexels.com/videos/search?query=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$query")&per_page=15&orientation=$orient")
    python3 -c '
import sys, json
pick = int(sys.argv[2])
d = json.loads(sys.argv[1])
vids = d.get("videos", [])
if pick >= len(vids): sys.exit(1)
v = vids[pick]
files = [f for f in v.get("video_files", []) if f.get("file_type") == "video/mp4" and f.get("link")]
files.sort(key=lambda f: (f.get("width") or 0) * (f.get("height") or 0))
big = [f for f in files if (f.get("width") or 0) >= 1920 and (f.get("height") or 0) >= 1080]
c = big[0] if big else (files[-1] if files else None)
if not c: sys.exit(1)
print("\t".join([c["link"], str(v.get("id","")), v.get("user",{}).get("name",""), v.get("url","")]))
' "$body" "$pick"
  else
    return 1
  fi
}

pixabay_lookup() {
  local entry="$1"
  local query pick
  query=$(jq -r '.query // empty' <<<"$entry")
  pick=$(jq -r '.pick // 0' <<<"$entry")
  [[ -n "$query" ]] || return 1
  curl -s "https://pixabay.com/api/videos/?key=$PIXABAY_KEY&q=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$query")&per_page=15&video_type=film" | python3 - "$pick" <<'PY'
import sys, json
pick = int(sys.argv[1])
d = json.load(sys.stdin)
hits = d.get("hits", [])
if pick >= len(hits):
    sys.exit(1)
h = hits[pick]
v = h.get("videos", {})
for q in ("large", "medium", "small"):
    if v.get(q, {}).get("url"):
        f = v[q]
        print("\t".join([f["url"], str(h.get("id", "")), h.get("user", ""),
                         f"https://pixabay.com/videos/id-{h.get('id','')}/"]))
        sys.exit(0)
sys.exit(1)
PY
}

n=$(jq 'length' "$CLIPS_JSON")
echo "▶ stock-fetch: $n entries -> $OUTDIR"

for ((i = 0; i < n; i++)); do
  entry=$(jq -c ".[$i]" "$CLIPS_JSON")
  key=$(jq -r '.key' <<<"$entry")
  out="$OUTDIR/$key.mp4"

  if [[ -s "$out" && "${FORCE_REFETCH:-0}" != "1" ]]; then
    log "· $key cached"
    continue
  fi

  row=""
  if [[ -n "$PEXELS_KEY" ]]; then row=$(pexels_lookup "$entry") || row=""; fi
  if [[ -z "$row" && -n "$PIXABAY_KEY" ]]; then row=$(pixabay_lookup "$entry") || row=""; fi
  [[ -n "$row" ]] || { log "✗ $key — no result"; continue; }

  IFS=$'\t' read -r vurl vid vauthor vpage <<<"$row"
  start=$(jq -r '.start // 0' <<<"$entry")
  dur=$(jq -r '.duration // 6' <<<"$entry")

  tmp="$(mktemp -d)"; src="$tmp/src"
  curl -sL -o "$src" "$vurl" || { log "✗ $key — download failed"; rm -rf "$tmp"; continue; }

  # some stock clips are shorter than requested; ffmpeg just stops early
  ffmpeg -y -hide_banner -loglevel error -ss "$start" -i "$src" -t "$dur" \
    -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},format=yuv420p" \
    -an -c:v libx264 -preset veryfast -crf 20 "$out" || { log "✗ $key — transcode failed"; rm -rf "$tmp"; continue; }
  rm -rf "$tmp"

  jq --arg k "$key" --arg id "$vid" --arg a "$vauthor" --arg p "$vpage" \
     '.[$k] = {source:"pexels", id:$id, author:$a, license:"Pexels License", page:$p}' \
     "$CREDITS" > "$CREDITS.tmp" && mv "$CREDITS.tmp" "$CREDITS"

  log "✓ $key — $vauthor (#$vid)"
done

echo "✓ done ($(jq 'length' "$CREDITS") credited)"
