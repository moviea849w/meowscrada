---
name: shorts
description: Use for making vertical short videos (YouTube Shorts, TikTok, Reels) - 9:16 crop, hooks, captions, pacing, and export.
---

# Shorts Skill

Create 15–60s vertical videos: 1080x1920 (9:16).

## Rules of thumb
- Hook in first 1–2 seconds (visual or text)
- Fast cuts every 1–3s, no dead air
- Burned-in captions (most watch muted)
- End with loop-able or CTA frame

## ffmpeg recipes
Vertical crop (any source):
`ffmpeg -i in.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -c:a aac -movflags +faststart out.mp4`

Text hook overlay:
`ffmpeg -i in.mp4 -vf "drawtext=text='HOOK':fontsize=90:fontcolor=white:borderw=4:x=(w-tw)/2:y=200" -c:a copy out.mp4`

Burned-in captions (srt):
`ffmpeg -i in.mp4 -vf "subtitles=subs.srt:force_style='FontSize=20,Outline=2'" -c:a copy out.mp4`

Loop-safe cut to 30s:
`ffmpeg -i in.mp4 -t 30 -c copy out.mp4`

Cover frame:
`ffmpeg -i in.mp4 -ss 00:00:01 -vframes 1 cover.jpg`

## Workflow
1. Idea + hook line
2. Script (30–45s spoken)
3. Visuals in 9:16
4. Edit + captions
5. Cover frame + upload
6. Log in .memory/done.md
