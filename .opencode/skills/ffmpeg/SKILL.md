---
name: ffmpeg
description: Use ffmpeg for YouTube video creation - trimming, converting, audio extraction, captions, thumbnails, and batch processing.
---

# ffmpeg Skill

Use ffmpeg (verified 6.1.1 installed) for YouTube workflow in this repo.

## Core commands

Trim:
`ffmpeg -i input.mp4 -ss 00:00:10 -t 00:00:30 -c copy trimmed.mp4`

Convert to YouTube-ready MP4 (H.264 + AAC):
`ffmpeg -i input.mov -c:v libx264 -c:a aac -movflags +faststart output.mp4`

Extract audio:
`ffmpeg -i input.mp4 -vn -c:a mp3 audio.mp3`

Extract frames / thumbnail:
`ffmpeg -i input.mp4 -ss 00:00:05 -vframes 1 thumb.jpg`

Resize / scale:
`ffmpeg -i input.mp4 -vf scale=1920:1080 output.mp4`

Concatenate files:
`ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4`

Add subtitles (srt):
`ffmpeg -i input.mp4 -i subs.srt -c copy -c:s mov_text output.mp4`

## Workflow guidance
1. Check codec/format: `ffprobe input.mp4`
2. Process to .memory/ or output/ folder, never overwrite originals.
3. Log finished edits in .memory/done.md, create ticket in .memory/tickets/
4. Verify with `ffprobe` and `ffmpeg -version`
