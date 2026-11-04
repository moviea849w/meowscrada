# Ticket 001 — First Short Video

Status: open

## Steps
- [ ] Pick topic + hook (1–2s attention grab)
- [ ] Write 30–45s script
- [ ] Record/collect visuals (9:16)
- [ ] Edit with ffmpeg to 1080x1920, ≤60s
- [ ] Add burned-in captions
- [ ] Make cover/thumbnail frame
- [ ] Export YouTube-ready MP4 (H.264, +faststart)
- [ ] Upload as Short

## ffmpeg starter
```bash
# Vertical crop to 9:16, YouTube-ready
ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -c:v libx264 -c:a aac -movflags +faststart out/short-001.mp4
```
