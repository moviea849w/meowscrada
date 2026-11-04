#!/usr/bin/env bash
# art-fetch.sh — fetch public-domain artwork from Wikimedia + Wikipedia APIs
#
# Four lookup modes per entry (in order of reliability for history):
#   category  — list files in a Commons category            (best for historical topics)
#   file      — exact file name on Commons                  (most precise)
#   wiki      — lead image of a Wikipedia article           (fast, good portraits)
#   search    — Commons full-text search                    (last resort; modern photos)
#
# Usage:
#   ./scripts/art-fetch.sh episodes/001-medieval-king/art.json assets/art/001-medieval-king
#
# art.json is an array:
#   { "key": "tower",     "category": "Category:Tower of London in the 14th century", "pick": 0 }
#   { "key": "richard",   "file": "File:The Westminster Portrait of Richard II of England (1390s).jpg" }
#   { "key": "wat",       "wiki": "Wat Tyler" }
#   { "key": "plague",    "search": "Black Death miniature manuscript" }
#
# Output:
#   <outdir>/<key>.jpg       normalized JPEG, max 2400px wide
#   <outdir>/credits.json    title, author, license, page URL, size per key

set -uo pipefail

ART_JSON="${1:?usage: art-fetch.sh ART_JSON OUTDIR}"
OUTDIR="${2:?usage: art-fetch.sh ART_JSON OUTDIR}"
mkdir -p "$OUTDIR"

UA="meowscrada-video/1.0 (educational; github.com/moviea849w/meowscrada)"
COMMONS="https://commons.wikimedia.org/w/api.php"
WIKI="https://en.wikipedia.org/w/api.php"

# Resolve an entry to a Commons file title
resolve_title() {
  local entry="$1"

  local cat file wiki search
  cat=$(jq -r '.category // empty' <<<"$entry")
  file=$(jq -r '.file // empty' <<<"$entry")
  wiki=$(jq -r '.wiki // empty' <<<"$entry")
  search=$(jq -r '.search // empty' <<<"$entry")
  local pick
  pick=$(jq -r '.pick // 0' <<<"$entry")

  if [[ -n "$file" ]]; then
    echo "$file"; return
  fi

  if [[ -n "$cat" ]]; then
    # list image files in the category, skipping pdf/svg/djvu noise and maps
    curl -sL -A "$UA" "$COMMONS?action=query&format=json&list=categorymembers&cmtitle=$(jq -rn --arg v "$cat" '$v|@uri')&cmtype=file&cmlimit=200" \
      | jq -r --argjson p "$pick" '
          [.query.categorymembers[]?.title
           | select(test("\\.(jpe?g|png|tiff?)$"; "i"))
           | select(test("map|plan|coin|seal|diagram|icon|logo"; "i") | not)][$p] // empty'
    return
  fi

  if [[ -n "$wiki" ]]; then
    # lead image filename from the Wikipedia article
    curl -sL -A "$UA" "$WIKI?action=query&format=json&titles=$(jq -rn --arg v "$wiki" '$v|@uri')&prop=pageimages&piprop=name" \
      | jq -r '.query.pages | to_entries[0].value.pageimage // empty'
    return
  fi

  if [[ -n "$search" ]]; then
    curl -sL -A "$UA" "$COMMONS?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=$(jq -rn --arg v "$search" '$v|@uri')&gsrlimit=8" \
      | jq -r --argjson p "$pick" '
          [.query.pages[]?.title
           | select(test("\\.(jpe?g|png|tiff?)$"; "i"))][$p] // empty'
    return
  fi
}

COUNT=$(jq 'length' "$ART_JSON")
echo "▶ $COUNT entries → $OUTDIR"
[[ -f "$OUTDIR/credits.json" ]] || echo '{}' > "$OUTDIR/credits.json"

# --force re-downloads everything; default reuses existing files
FORCE=0
[[ "${FORCE_REFETCH:-0}" == "1" ]] && FORCE=1

for i in $(seq 0 $((COUNT - 1))); do
  entry=$(jq -c ".[$i]" "$ART_JSON")
  key=$(jq -r '.key' <<<"$entry")

  if [[ "$FORCE" -eq 0 && -s "$OUTDIR/$key.jpg" ]]; then
    echo "  · $key — already present"
    continue
  fi

  title=$(resolve_title "$entry")
  if [[ -z "$title" || "$title" == "null" ]]; then
    echo "  ✗ $key — nothing found"
    continue
  fi
  # normalize "Name.jpg" → "File:Name.jpg"
  [[ "$title" == File:* ]] || title="File:$title"

  resp=$(curl -sL -A "$UA" "$COMMONS?action=query&format=json&titles=$(jq -rn --arg v "$title" '$v|@uri')&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2400")

  url=$(jq -r '(.query.pages | to_entries[0].value.imageinfo[0].thumburl) // (.query.pages | to_entries[0].value.imageinfo[0].url) // empty' <<<"$resp")
  width=$(jq -r '(.query.pages | to_entries[0].value.imageinfo[0].width) // 0' <<<"$resp")

  if [[ -z "$url" || "$url" == "null" ]]; then
    echo "  ✗ $key — no url for $title"
    continue
  fi

  raw="$OUTDIR/.raw-$key"
  curl -sL -A "$UA" -o "$raw" "$url"

  # keep an existing good file if this download is broken
  if ! ffmpeg -y -hide_banner -loglevel error -i "$raw" \
      -vf "scale='min(2400,iw)':-2" -q:v 3 -map_metadata -1 "$OUTDIR/$key.jpg" 2>/dev/null; then
    rm -f "$raw"
    if [[ -s "$OUTDIR/$key.jpg" ]]; then
      echo "  ~ $key — download failed, kept existing file"
      continue
    fi
    echo "  ✗ $key — could not decode ($title)"
    continue
  fi
  rm -f "$raw"

  author=$(jq -r '(.query.pages | to_entries[0].value.imageinfo[0].extmetadata.Artist.value) // ""' <<<"$resp" \
    | sed 's/<[^>]*>//g' | tr -s ' \n' ' ' | cut -c1-120 || true)
  license=$(jq -r '(.query.pages | to_entries[0].value.imageinfo[0].extmetadata.LicenseShortName.value) // ""' <<<"$resp")
  page=$(jq -r '(.query.pages | to_entries[0].value.imageinfo[0].descriptionurl) // ""' <<<"$resp")
  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$OUTDIR/$key.jpg")

  jq --arg k "$key" --arg t "$title" --arg a "$author" --arg l "$license" --arg p "$page" --arg d "$dims" --argjson w "$width" \
    '. + {($k): {title:$t, author:$a, license:$l, page:$p, size:$d, sourceWidth:$w}}' \
    "$OUTDIR/credits.json" > "$OUTDIR/credits.json.tmp" && mv "$OUTDIR/credits.json.tmp" "$OUTDIR/credits.json"

  echo "  ✓ $key  ${dims}  ${license:-?}  ${title#File:}"
done

echo "✓ credits: $OUTDIR/credits.json"
