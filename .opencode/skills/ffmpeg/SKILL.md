---
name: ffmpeg
description: Use ffmpeg in this repo to build and fix episodes - Ken Burns clips, xfade merges, audio mixing and limiting, Hinglish subtitle burn-in, footage compositing, probing and frame grabs. Load when a render looks wrong, a merge truncates, audio clips, or a new ffmpeg recipe is needed.
---

# ffmpeg Skill

ffmpeg 6.1.1, 2-core CPU, no GPU. Everything here is verified on real renders — the
recipes below are the ones this pipeline actually uses, not a general cheat sheet.

## This repo's ffmpeg recipes

**Ken Burns clip from a still** (zoompan needs `scale` first and an explicit `s=`):
```bash
ffmpeg -loop 1 -i still.png -t 6 \
  -vf "scale=2304:1296,zoompan=z='min(zoom+0.0005,1.12)':d=180:s=1920x1080:fps=30" \
  -c:v libx264 -crf 19 -pix_fmt yuv420p clip.mp4
```

**Crossfade a chain of clips.** Chain pairwise, never one filter with 20 inputs.
Use `fadeblack`, never `fade` — with `fade`, two headlines overlap and both stay readable.
```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
  "[0][1]xfade=transition=fadeblack:duration=0.5:offset=5.5" out.mp4
```
Pad each input to the xfade length first, or the merge truncates the tail
(fixed 2026-11-04 — see `.memory/failures.md`).

**Mix narration + music without clipping.** `amix normalize=0` peaks at 0 dB and clips;
`alimiter` at the end fixes it. Music ~-20 LUFS sits under voice.
```bash
ffmpeg -i voice.wav -i music.mp3 -filter_complex \
  "[1:a]volume=0.18[m];[0:a][m]amix=inputs=2:normalize=0,alimiter=limit=0.89[a]" \
  -map 0:v -map "[a]" -c:v libx264 -crf 19 -c:a aac out.mp4
```

**Burn subtitles — must re-encode video.** `-c:v copy` silently drops the change.
```bash
ffmpeg -i in.mp4 -vf "subtitles=subs.srt:force_style='FontName=Poppins,FontSize=22,Outline=2'" \
  -c:v libx264 -crf 19 -c:a copy out.mp4
```

**Composite text over footage.** The overlay must be a transparent PNG; footage loops if
shorter than the narration.
```bash
ffmpeg -stream_loop -1 -i footage.mp4 -i overlay.png -t 7 \
  -filter_complex "[0:v][1:v]overlay=0:0" -c:v libx264 -crf 19 -pix_fmt yuv420p out.mp4
```

**Blend keyframes into a clip** (the 2D animation path):
```bash
ffmpeg -framerate 6 -i frames/%03d.png \
  -vf "fps=30,scale=1920:1080" -c:v libx264 -crf 18 -pix_fmt yuv420p anim.mp4
```

## General commands

Trim: `ffmpeg -i in.mp4 -ss 00:00:10 -t 30 -c copy out.mp4`
Extract audio: `ffmpeg -i in.mp4 -vn -c:a mp3 out.mp3`
Frame grab: `ffmpeg -i in.mp4 -ss 00:00:05 -vframes 1 thumb.jpg`
Concat (same codecs): `ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4`
Probe: `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration -of default=nw=1 in.mp4`

## Rules

1. **Always probe the result** — duration, resolution, fps, audio stream. Silent truncation
   and missing audio tracks are the two most common failures.
2. **Never `-c:v copy` when a filter touches pixels** (subtitles, overlay, scale).
3. Render intermediates to `.temp/<slug>/`, never overwrite source assets.
4. Long xfade chains and `zoompan` are the usual suspects when something looks off.
5. New recipes go in this file, and new failures in `.memory/failures.md`.
