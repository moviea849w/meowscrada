---
name: captions
description: Use for generating and burning subtitles/captions into videos - Whisper transcription, SRT editing, and ffmpeg burn-in for shorts.
---

# Captions Skill

Auto-captions and burn-in for short videos.

## Generate with Whisper
```bash
pip install -U openai-whisper
whisper audio.mp3 --model small --output_format srt --language en
```

Extract audio first if needed:
`ffmpeg -i in.mp4 -vn -c:a mp3 audio.mp3`

## Burn subtitles into video
```bash
ffmpeg -i in.mp4 -vf "subtitles=audio.srt:force_style='FontName=Arial,FontSize=18,Outline=2,Bold=1'" \
  -c:v libx264 -c:a aac out.mp4
```

## Short-form caption style
- 2–5 words per line, centered lower third
- High contrast (white + black outline)
- Sync tight; fix Whisper timings manually for hooks

## Notes
- Keep .srt files in .memory or project folder for re-edits
- Log caption work in .memory/done.md
