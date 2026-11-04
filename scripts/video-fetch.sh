#!/usr/bin/env bash
# video-fetch.sh — fetch real stock footage from Wikimedia Commons
#
# No API key needed. Clips are transcoded to a uniform 1920x1080 H.264 so they
# drop straight into the Ken Burns / xfade pipeline.
#
# Usage:
#   ./scripts/video-fetch.sh episodes/003-never-sleep/clips.json assets/clips/003-never-sleep
#
# clips.json is an array:
#   { "key": "sleeping",   "search": "sleeping person",  "minWidth": 1000 }
#   { "key": "brain",      "file": "File:Colourised Axial MRI brain scan.webm" }
#   { "key": "night",      "search": "traffic night",    "pick": 2 }
#
# Per entry:
#   key        output name (-> <key>.mp4)
#   search     Commons full-text search for videos
#   file       exact Commons file title (most reliable)
#   pick       0-based index among search results (default 0)
#   minWidth   skip results narrower than this (default 800)
#   start      seconds to start the cut at (default 0)
#   duration   seconds to keep (default 6)
#   mute       strip audio (default 1 — narration carries the mix)
#
# Output:
#   <outdir>/<key>.mp4       1920x1080, 30 fps, no audio
#   <outdir>/credits.json    title, author, license, page URL per key
#
# Existing files are kept unless FORCE_REFETCH=1.

set -uo pipefail

CLIPS_JSON="${1:?usage: video-fetch.sh CLIPS_JSON OUTDIR}"
OUTDIR="${2:?usage: video-fetch.sh CLIPS_JSON OUTDIR}"
mkdir -p "$OUTDIR"

UA="meowscrada-video/1.0 (educational; github.com/moviea849w/meowscrada)"
COMMONS="https://commons.wikimedia.org/w/api.php"
CREDITS="$OUTDIR/credits.json"
[[ -f "$CREDITS" ]] || echo '{}' > "$CREDITS"

W=1920; H=1080; FPS=30

log()  { echo "  $*"; }
die()  { echo "  ✗ $*"; return 1; }

# query the API for one entry, print "<title>\t<url>\t<width>\t<height>\t<duration>"
lookup() {
  local entry="$1"
  local file search pick minw
  file=$(jq -r '.file // empty' <<<"$entry")
  search=$(jq -r '.search // empty' <<<"$entry")
  pick=$(jq -r '.pick // 0' <<<"$entry")
  minw=$(jq -r '.minWidth // 800' <<<"$entry")

  local url
  if [[ -n "$file" ]]; then
    url="$COMMONS?action=query&titles=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$file")&prop=imageinfo&iiprop=url|size|mediatype|extmetadata&format=json"
  elif [[ -n "$search" ]]; then
    url="$COMMONS?action=query&generator=search&gsrsearch=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$search filetype:video")&gsrlimit=12&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mediatype|extmetadata&format=json"
  else
    return 1
  fi

  curl -s -H "User-Agent: $UA" "$url" | python3 - "$pick" "$minw" <<'PY'
import sys, json
pick, minw = int(sys.argv[1]), int(sys.argv[2])
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(1)
pages = (data.get("query") or {}).get("pages") or {}
rows = []
for p in pages.values():
    ii = (p.get("imageinfo") or [{}])[0]
    if ii.get("mediatype") != "VIDEO":
        continue
    if (ii.get("width") or 0) < minw:
        continue
    meta = ii.get("extmetadata") or {}
    def m(k):
        v = meta.get(k, {}).get("value", "")
        import re
        return re.sub(r"<[^>]+>", "", v).strip()
    rows.append({
        "title": p.get("title", ""),
        "url": ii.get("url", ""),
        "width": ii.get("width", 0),
        "height": ii.get("height", 0),
        "duration": ii.get("duration", 0),
        "author": m("Artist"),
        "license": m("LicenseShortName"),
        "page": ii.get("descriptionurl", ""),
    })
rows.sort(key=lambda r: -(r["width"] * r["height"]))
if pick < len(rows):
    r = rows[pick]
    print("\t".join(str(r[k]) for k in ("title","url","width","height","duration","author","license","page")))
PY
}

n=$(jq 'length' "$CLIPS_JSON")
echo "▶ video-fetch: $n entries -> $OUTDIR"

for ((i = 0; i < n; i++)); do
  entry=$(jq -c ".[$i]" "$CLIPS_JSON")
  key=$(jq -r '.key' <<<"$entry")
  out="$OUTDIR/$key.mp4"

  if [[ -s "$out" && "${FORCE_REFETCH:-0}" != "1" ]]; then
    log "· $key cached"
    continue
  fi

  row=$(lookup "$entry") || { die "$key — lookup failed"; continue; }
  [[ -n "$row" ]] || { die "$key — no results"; continue; }

  IFS=$'\t' read -r title vurl vw vh vdur author license page <<<"$row"
  start=$(jq -r '.start // 0' <<<"$entry")
  dur=$(jq -r '.duration // 6' <<<"$entry")

  # don't ask for more than the clip has
  avail=$(python3 -c "print(max(1.0, float('${vdur:-0}') - float('${start}')))")
  keep=$(python3 -c "print(min(float('${dur}'), float('${avail}')))")

  tmp="$(mktemp -d)"
  src="$tmp/src"
  curl -sL -H "User-Agent: $UA" -o "$src" "$vurl" || { die "$key — download failed"; rm -rf "$tmp"; continue; }

  # cover-fit to 1920x1080 (crop the overflow), constant fps, no audio
  ffmpeg -y -hide_banner -loglevel error -ss "$start" -i "$src" -t "$keep" \
    -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},format=yuv420p" \
    -an -c:v libx264 -preset veryfast -crf 20 "$out" || { die "$key — transcode failed"; rm -rf "$tmp"; continue; }
  rm -rf "$tmp"

  jq --arg k "$key" --arg t "$title" --arg a "$author" --arg l "$license" --arg p "$page" \
     --arg u "$vurl" --argjson w "$vw" --argjson h "$vh" \
     '.[$k] = {title:$t, author:$a, license:$l, page:$p, source:$u, width:$w, height:$h}' \
     "$CREDITS" > "$CREDITS.tmp" && mv "$CREDITS.tmp" "$CREDITS"

  log "✓ $key  ${vw}x${vh}  ${keep}s  — $title"
done

echo "✓ done ($(jq 'length' "$CREDITS") credited)"
