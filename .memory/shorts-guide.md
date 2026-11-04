# Shorts Guide — making and sharing short videos

End-to-end guide for the short-form pipeline in this repo.

## 1. Format
- Vertical **1080x1920 (9:16)**
- **15–60 seconds**
- Platforms: YouTube Shorts, TikTok, Instagram Reels
- Hook in the first **1–2 seconds**, captions burned in, fast cuts

## 2. Pipeline
```
idea → hook script → visuals (9:16) → edit → captions → cover frame → export → upload
```

## 3. Render a test short
```bash
./scripts/make-short.sh "MEOW SORA" 10
```
- Renders `.temp/short-<timestamp>.mp4` (1080x1920, H.264 + AAC, faststart)
- Uploads it to tmpfiles.org and prints share links
- `--no-upload` renders only

## 4. Upload any file for sharing
```bash
tmpfiles video.mp4              # symlinked from ~/.local/bin
tmpfiles --clipboard video.mp4  # also copies direct link
./scripts/tmpfiles a.mp4 b.mp4  # multiple files
```
- Prints a **page** link and a **direct download** link (`/dl/`)
- Links expire after **~1 hour**

## 5. Manual ffmpeg recipes
Vertical crop from any source:
```bash
ffmpeg -i in.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -c:v libx264 -c:a aac -movflags +faststart out/short.mp4
```

Trim:
```bash
ffmpeg -i in.mp4 -ss 00:00:02 -t 30 -c copy out.mp4
```

Text hook:
```bash
ffmpeg -i in.mp4 -vf "drawtext=text='HOOK':fontsize=90:fontcolor=white:borderw=4:x=(w-tw)/2:y=200" out.mp4
```

Burn captions:
```bash
ffmpeg -i in.mp4 -vf "subtitles=subs.srt:force_style='FontSize=20,Outline=2'" out.mp4
```

Cover frame:
```bash
ffmpeg -i in.mp4 -ss 00:00:01 -vframes 1 cover.jpg
```

## 6. Captions
```bash
ffmpeg -i in.mp4 -vn -c:a mp3 audio.mp3
whisper audio.mp3 --model small --output_format srt --language en
```
Then burn in with the subtitles filter above.

## 7. Thumbnails / covers
```bash
magick cover.jpg -resize 1080x1920^ -gravity center -extent 1080x1920 short-cover.jpg
```

## 8. Related skills
- `shorts` — pacing, hooks, vertical recipes
- `ffmpeg` — conversions, trimming, batch
- `captions` — Whisper + burn-in
- `thumbnail` — covers and thumbnails
- `remotion` — code-driven videos (optional)
- `obscura` — research/reference browsing

## 9. Housekeeping
- Rendered videos and temp files live in `.temp/` (gitignored)
- Log finished work in `.memory/done.md`
- Track tasks in `.memory/tickets/`
