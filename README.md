# meowscrada

Curiosity-based educational explainer videos for YouTube: long-form (16:9, 5–8 min) plus shorts cut from them.
Hindi voiceover, English-only on-screen text, public-domain artwork.

**New here? Read [`.memory/index.md`](./.memory/index.md) first.** It's the entry point to everything.

## Quick start
```bash
# 1. Build an episode: art → Takumi scene stills → Ken Burns → merged video + Hindi narration
./scripts/longform.sh episodes/001-medieval-king

# 2. Pilot the first 3 scenes only (fast look check)
./scripts/longform.sh episodes/001-medieval-king --pilot=3 --no-upload

# 3. Voiceover only (Hindi, numbers in English)
./scripts/tts -l hi "सवाल: 12 जोड़ 15 कितना होता है?"

# 4. Upload any file for sharing (expires ~1h)
tmpfiles out.mp4
```

## Memory layout
| File | What it is |
|---|---|
| `.memory/index.md` | Start here — index of everything |
| `.memory/access.md` | Tokens/keys location + how to trigger CI (never commit them) |
| `.memory/goal.md` | The goal: curiosity explainers, long + short |
| `.memory/done.md` | Completed work log |
| `.memory/tickets/` | Open tasks |
| `.memory/guide.md` | Reference guides index || `.memory/longform-guide.md` | **Long-form pipeline** — episode shape, script format, rendering |
| `.memory/assets-guide.md` | **Asset library** — art/music/SFX fetch, licenses, credits |
| `.memory/voiceover-guide.md` | Voiceover rules (Hindi, numbers in English) |
| `.memory/takumi-guide.md` | Takumi card rendering |
| `.memory/shorts-guide.md` | Short-video pipeline |
| `.memory/obscura-guide.md` | Webpage → PNG backgrounds |
| `.memory/kino-guide.md` | Kino JSON → MP4 (experimental, not main pipeline) |

## Scripts
| Script | Purpose |
|---|---|
| `scripts/pipeline.sh STEP [episode]` | **Run one pipeline step** (`art`/`tts`/`still`/`clip`/`merge`/`audio`/`upload`/`all`), with `--scene N` control |
| `scripts/longform.sh DIR` | Run the whole episode pipeline in one go |
| `scripts/art-fetch.sh JSON DIR` | Fetch public-domain artwork (Wikimedia/Wikipedia APIs) |
| `scripts/audio-fetch.sh music\|sfx JSON DIR` | Build the CC0/CC-BY music and SFX library |
| `scripts/math-short.sh A B` | Vertical quiz short (Takumi cards + ffmpeg) |
| `scripts/kino-math.sh A B` | Experimental: quiz as a Kino JSON composition |
| `scripts/tts [-l hi] "text"` | Local TTS (Piper) → WAV |
| `scripts/bg-render.sh URL` | Obscura screenshot → 1080x1920 PNG |
| `scripts/tmpfiles FILE...` | Upload to tmpfiles.org |

## Assets
`assets/` is committed to git — artwork, music, SFX, backgrounds and fonts. Every folder has a `credits.json`; paste it into video descriptions. Only CC0 / CC-BY / CC-BY-SA / public domain is allowed.

## Requirements
- ffmpeg, Python 3 + `piper-tts`, Noto Devanagari fonts, Obscura binary (see guides)
- Skills in `.opencode/skills/`: ffmpeg, shorts, captions, thumbnail, remotion, obscura
