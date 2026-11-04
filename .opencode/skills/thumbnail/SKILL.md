---
name: thumbnail
description: Use for creating YouTube thumbnails and short-video cover frames - frame grabs, text overlays, and ImageMagick resizing.
---

# Thumbnail Skill

Make thumbnails and cover frames.

## Grab a frame
`ffmpeg -i in.mp4 -ss 00:00:02 -vframes 1 -q:v 2 frame.jpg`

## Add bold text (ffmpeg)
```bash
ffmpeg -i frame.jpg -vf "drawtext=text='TITLE':fontsize=110:fontcolor=white:borderw=6:bordercolor=black:x=(w-tw)/2:y=h-th-80" -frames:v 1 thumb.jpg
```

## Resize with ImageMagick
```bash
sudo apt-get install -y imagemagick
magick thumb.jpg -resize 1280x720^ -gravity center -extent 1280x720 yt-thumb.jpg
magick cover.jpg -resize 1080x1920^ -gravity center -extent 1080x1920 short-cover.jpg
```

## Rules
- 1 idea, 3–4 words max on thumbnail
- High contrast, readable at small size
- Faces/eyes/emotion drive clicks
- Shorts cover: 1080x1920
