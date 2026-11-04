# meowscrada

Short-form video studio for a YouTube channel: Hindi math quizzes + AI cat shorts.

**New here? Read [`.memory/index.md`](./.memory/index.md) first.** It's the entry point to everything.

## Quick start
```bash
# 1. Render + upload a Hindi math quiz short
./scripts/math-short.sh 12 15

# 2. Voiceover only (Hindi, numbers in English)
./scripts/tts -l hi "सवाल: 12 जोड़ 15 कितना होता है?"

# 3. Render a webpage as a 1080x1920 background PNG
./scripts/bg-render.sh https://example.com --dark

# 4. Upload any file for sharing (expires ~1h)
tmpfiles out.mp4
```

## Memory layout
| File | What it is |
|---|---|
| `.memory/index.md` | Start here — index of everything |
| `.memory/goal.md` | The goal: short videos for the channel |
| `.memory/done.md` | Completed work log |
| `.memory/tickets/` | Open tasks |
| `.memory/guide.md` | Reference guides index |
| `.memory/shorts-guide.md` | Full short-video pipeline |
| `.memory/voiceover-guide.md` | Voiceover rules (Hindi, numbers in English) |
| `.memory/obscura-guide.md` | Webpage → PNG backgrounds |

## Scripts
| Script | Purpose |
|---|---|
| `scripts/math-short.sh A B` | Hindi math quiz short (timer, options, voiceover) |
| `scripts/make-short.sh "TEXT" N` | Simple text short |
| `scripts/tts [-l hi] "text"` | Local TTS (Piper) → WAV |
| `scripts/bg-render.sh URL` | Obscura screenshot → 1080x1920 PNG |
| `scripts/tmpfiles FILE...` | Upload to tmpfiles.org |

## Requirements
- ffmpeg, Python 3 + `piper-tts`, Noto Devanagari fonts, Obscura binary (see guides)
- Skills in `.opencode/skills/`: ffmpeg, shorts, captions, thumbnail, remotion, obscura
