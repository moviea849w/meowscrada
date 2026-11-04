# Video Guide — how episodes are built now

Three ways a scene can be made. The pipeline picks automatically from `scenes.json`.

| Scene has | Built from | Looks like |
|---|---|---|
| `"footage": "key"` | stock video + rendered type overlay | real footage, text locked over it |
| `"animate": "name"` | 18 keyframes → interpolated | drawn 2D animation |
| neither | one Takumi still + Ken Burns | still image with slow zoom |

Every scene also gets a Hinglish subtitle burned in at the audio step.

---

## 1. Stock footage (Pexels)

```bash
# one-time: free key from pexels.com/api
echo 'PEXELS_API_KEY=xxxx' > ~/.config/meowscrada/env

./scripts/stock-fetch.sh episodes/<slug>/clips.json assets/clips/<slug>
```

`clips.json`:

```json
[
  { "key": "sleeping",  "query": "person sleeping in bed", "duration": 6 },
  { "key": "night",     "query": "driving car at night",   "pick": 2, "duration": 5 }
]
```

Output is **1920x1080, 30 fps, no audio** — already cropped to frame, so it drops
straight in. Credits are written to `assets/clips/<slug>/credits.json`.

Then in `scenes.json`: `"footage": "sleeping"`.

The type overlay (`render-overlay.tsx`) renders once per scene to a transparent PNG
with a bottom scrim, and ffmpeg composites it over the moving video. **The text does
not move with the footage** — that is what makes it read as a title.

Notes:
- Footage shorter than the narration is looped automatically (`-stream_loop -1`).
- `stock-fetch.sh` also supports Pixabay if `PIXABAY_API_KEY` is set; Pexels is tried first.
- Keep keys in `~/.config/meowscrada/env`, never in the repo. `.env` is gitignored.

## 2. 2D animation (keyframes)

This is how we get motion without a browser or GPU.

```json
{ "animate": "adenosine", "frames": 18, "animMode": "blend",
  "kicker": "WHAT BUILDS UP", "text": "A waste product\nbuilds up.", "accent": "builds up." }
```

Available animations (`assets/takumi/animate.tsx`):

| Name | What it draws |
|---|---|
| `adenosine` | dots fill a skull, then flush out to the right |
| `wave-in` | a waveform draws itself left to right |
| `wave-flip` | same, inverted (the "upside down" beat) |
| `cancel` | two waves converge and flatten to a line |
| `clock` | a clock hand sweeps and stops |
| `stacking` | bars grow one after another |
| `patches` | a grid of cells switches off one by one (local sleep) |

Each is a function `(t, palette) → JSX` where `t` runs 0→1 across the scene, so
every keyframe is genuinely different. Add new ones to `ANIMATIONS` in `animate.tsx`.

**How the interpolation works** (`scripts/keyframes2clip.sh`):
- `blend` (default) — native keyframe rate, retimed to 30 fps. Fast, text-safe.
- `minterpolate` — optical-flow, genuinely smooth. Smears text, so only for pure shapes.

Cost: 18 keyframes ≈ 2 s of render per scene. **Cheap.** Don't be shy.

## 3. Stills (the original path)

`assets/takumi/scene-templates.tsx` — `title`, `lower-third`, `quote`, `stat`, `split`.
Ken Burns zoom/pan applied in the clip step.

---

## Hinglish subtitles

Every scene should have a `"sub"` field: the Hindi line **in Latin script**.

```json
"say": "Din do pe uski aankhein focus karna band kar gayi.",
"sub": "Din 2 pe uski aankhein focus karna band kar gayi."
```

`scripts/make-srt.py` builds `subs.srt` from the **actual rendered clip durations**
plus the xfade offsets, so captions stay in sync even if a narration line gets
re-recorded. Burned in at the audio step, lower third, Poppins bold, dark plate.

Turn off with `"subtitles": false` in `episode.json`.

**Numbers in `sub` are digits** (2, 11, 264, 1997) even when `say` spells them out.
Digits read faster on screen; the voice still speaks them.

---

## Language rules

| Track | Language |
|---|---|
| `say` (audio) | Hindi, no English technical words, numbers spoken in English |
| on-screen `text`/`kicker` | English only |
| `sub` (captions) | Hinglish — Hindi in Latin script |

## Rendering

```bash
./scripts/pipeline.sh stock 003-never-sleep     # not yet wired — run stock-fetch.sh directly
./scripts/pipeline.sh tts   003-never-sleep
./scripts/pipeline.sh still 003-never-sleep     # skips footage/animated scenes
./scripts/pipeline.sh clip  003-never-sleep
./scripts/pipeline.sh merge 003-never-sleep
./scripts/pipeline.sh audio 003-never-sleep     # burns subtitles
```

`tts` is the slow step: Piper Hindi runs at ~0.95 RTF on 2 cores, so a 5-minute
episode takes ~6–8 minutes of pure TTS. Everything else is minutes.

## Gotchas (new ones)

- **Poppins has no arrow glyphs.** `→` and `↓` render as tofu boxes (□). Verified with
  fontTools: `→`, `↓` MISSING; `“”` `—` `’` `%` OK. Draw arrows as bars, or use words.
  Check any new symbol before using it:
  ```bash
  python3 -c "from fontTools.ttLib import TTFont; c=TTFont('assets/fonts/Poppins-ExtraBold.ttf').getBestCmap(); print('→' in [chr(k) for k in c])"
  ```
- **`python3 - <<'PY'` swallows piped stdin.** The heredoc becomes stdin, so
  `curl ... | python3 - <<'PY'` reads the script, not the JSON. Pass data as an
  argument instead (`python3 -c '...' "$body"`). This broke `stock-fetch.sh` first run.
- **Pexels file lists include many resolutions.** Pick width ≥ 1920 and height ≥ 1080,
  otherwise you get a 640px file that looks soft at 1080p.
- **Footage scenes must not go through the `still` step** — they have no still.
  The step skips them by checking for `footage`/`animate`.
- **Don't `-c:v copy` when burning subtitles.** The audio step now re-encodes video
  (crf 19) because the subtitle filter changes pixels.
