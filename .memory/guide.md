# Guide / Reference

Guides and references for making YouTube videos.

## Video workflow
1. Idea & scripting
2. Recording (screen / camera / voiceover)
3. Editing (cut, audio, captions, motion)
4. Thumbnail & title
5. Upload & SEO (description, tags)
6. Publish & promote

## Recommended packages / tools
- **ffmpeg** — ✅ installed — video/audio processing, conversion, trimming
- **yt-dlp** — download / archive references (check license/ToS before use)
- **ImageMagick** — thumbnails, image conversion
- **SoX** — audio cleanup / effects
- **Audacity** — audio editing (GUI)
- **OBS Studio** — screen recording / streaming
- **OpenShot / Kdenlive / Shotcut** — video editing (GUI)
- **DaVinci Resolve** — pro video editing (free tier)
- **Whisper** — auto captions / subtitles
- **Python + moviepy** — programmatic video creation
- **Node.js + remotion** — code-driven videos

## Guides
- [shorts-guide.md](./shorts-guide.md) — full guide: making + sharing short videos (scripts, ffmpeg recipes, captions, thumbnails)

## Helper scripts
- `scripts/make-short.sh "TEXT" 10` — render a vertical test short to `.temp/` and upload it
  - `--no-upload` to render only
- `scripts/tmpfiles FILE...` — upload any file to tmpfiles.org, prints page + direct link
  - `--clipboard` also copies the direct link
  - symlinked to `~/.local/bin/tmpfiles` (run from anywhere)
  - links expire ~1 hour

## ffmpeg cheatsheet
```bash
# Trim a video
ffmpeg -i input.mp4 -ss 00:00:10 -t 00:00:30 -c copy trimmed.mp4

# Convert to mp4
ffmpeg -i input.mov output.mp4

# Extract audio
ffmpeg -i input.mp4 -vn -c:a mp3 audio.mp3
```

## References
_Add links/docs here._
