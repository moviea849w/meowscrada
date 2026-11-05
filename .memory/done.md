# Done

## Completed
- [x] Installed ffmpeg (6.1.1)
- [x] Created `.memory` folder structure: index.md, goal.md, done.md, tickets/, guide.md
- [x] Added skills: ffmpeg, shorts, captions, thumbnail, remotion, obscura, unslop
- [x] Set up Exa AI MCP in opencode.json
- [x] **Pivoted to curiosity-based educational explainers** (long-form + shorts). Quiz/math content dropped.
- [x] Long-form pipeline: `scripts/longform.sh` (art → Takumi stills → Ken Burns → xfade → narration + music)
- [x] Scene template system (`scene-templates.tsx`) — 5 layouts, rotated per episode
- [x] Rough.js hand-drawn annotations (`render-doodles.mjs`)
- [x] Asset library committed: 7 artworks, 4 music tracks, 7 SFX, 4 background plates, all CC0/CC-BY/PD
- [x] Fetch scripts: `art-fetch.sh` (Wikimedia/Wikipedia), `audio-fetch.sh` (Openverse)
- [x] Thumbnail renderer (`render-thumb.tsx`)
- [x] Resume support in `longform.sh` (cached clips are skipped)
- [x] Episode 1 rendered: 4:29, 1080p, Hindi VO + music

## Log
- 2026-11-04: Initial setup; quiz-short experiments; Takumi + Poppins + unslop design pass.
- 2026-11-04: Kino installed but judged experimental (plain output). Takumi is the main rasterizer.
- 2026-11-04: **Concept pivot** — curiosity explainers, long-form + shorts. Episode 1 "Why Was Being a Medieval King So Dangerous?" built end to end.
- 2026-11-04: Episode 003 (what-if: never sleep) built: stock footage, 2D keyframes, Hinglish subs, CI render + Telegram delivery.
- 2026-11-05: **CI fixed and green.** Episode 003 rendered on GitHub Actions end to end
  (221 s, 31 MB) and delivered to Telegram in ~3 min with caches warm.
- 2026-11-05: Skills — imported 5 (explainer-video, diagram-animation, whiteboard-animation,
  editing-videos, video-structure-analyzer), added `roughjs`, rewrote `ffmpeg` for this pipeline.
- 2026-11-05: **Episode 003 render deleted on purpose** — starting a new video. Episode files kept.

## Next
- [ ] **Start the new video** (user's call: "we will start new")
- [ ] Fix `split` template headline wrapping (scene 11 orphaned "in")
- [ ] Natural Hindi voice: Piper is flat; needs cloud TTS or a bigger machine
- [ ] Cut 3–5 shorts from Episode 1
