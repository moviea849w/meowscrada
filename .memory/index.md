# Memory Index

Start here. This folder is the shared brain of the project — goals, tasks, done work, and guides. Read in this order.

## Start here
1. [goal.md](./goal.md) — what we're building (curiosity explainers, long-form + shorts)
2. [tickets/](./tickets/) — what's open right now
3. [guide.md](./guide.md) — index of all guides
4. [done.md](./done.md) — what's already finished

## Guides
- [longform-guide.md](./longform-guide.md) — **long-form pipeline**: episode shape, script format, scene templates, rendering
- [assets-guide.md](./assets-guide.md) — **asset library**: art/music/SFX fetching, license policy, credits
- [shorts-guide.md](./shorts-guide.md) — short-video pipeline (scripts, ffmpeg recipes, captions, thumbnails)
- [voiceover-guide.md](./voiceover-guide.md) — voiceover rules: Hindi audio, no technical words, numbers in English
- [obscura-guide.md](./obscura-guide.md) — render webpage backgrounds as 1080x1920 PNGs
- [takumi-guide.md](./takumi-guide.md) — Takumi card rendering (JSX → PNG)
- [kino-guide.md](./kino-guide.md) — Kino JSON → MP4 (installed, experimental; not the main pipeline)
- [setup-guide.md](./setup-guide.md) — fresh machine setup (all tools + how to verify)

## Conventions
- Work happens through **tickets** in `tickets/` (one file per task, e.g. `001-first-short.md`)
- When something is finished, tick it in the ticket and log it in `done.md`
- New reference material goes into a guide and gets linked in `guide.md`
- Rendered videos / temp files live in `.temp/` and are **not** committed
- `.memory/` is always committed — this is how anyone can pick up the project
