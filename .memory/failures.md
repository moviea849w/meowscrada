# Failures Log

Every blocker hit on this project, what caused it, and whether it's fixed.
Read this before debugging the same thing twice.

---

## 2026-11-04 — Remotion / Chrome in Codespaces

**Status: UNRESOLVED.** Remotion cannot render here; the GPU process crashes.

### What was installed
- `remotion`, `@remotion/cli`, `@remotion/three`, `three`, `@react-three/fiber`,
  `@react-three/postprocessing`, `postprocessing`, `react@19`, `react-dom@19`
- Location: **`/workspaces/remotion-studio`** (sibling folder, NOT inside `meowscrada`)
- Reason for sibling: the repo pins `react@18` for Takumi; Remotion's 3D stack needs React 19.
  Installing both in one `package.json` gives `ERESOLVE` peer conflicts.
- Chrome headless shell downloaded: `npx remotion browser ensure` → 102.5 MB, OK.

### Failure 1 — peer dependency conflict
```
npm error ERESOLVE could not resolve
```
**Cause:** React 18 (Takumi) vs React 19 (Remotion 3D stack).
**Fix:** separate folder + separate `package.json`. ✅ worked.

### Failure 2 — npm ENOTEMPTY during install
```
npm error code ENOTEMPTY
npm error syscall rmdir
npm error path .../node_modules/terser-webpack-plugin/dist
```
**Cause:** two `npm i` runs started concurrently (one backgrounded, one foreground).
**Fix:** `rm -rf node_modules package-lock.json` then install once. ✅ worked.
**Lesson: never launch two npm installs at once, even in different shells.**

### Failure 3 — Chrome browser connect timeout
```
TimeoutError: Timed out after 25000 ms while trying to connect to the browser!
Chrome logged: InitializeSandbox() called with multiple threads in process gpu-process.
```
**Cause:** Chrome starts but its GPU process dies; Remotion waits for a CDP connection that never lands.
**Tried:** default flags. ❌ failed.

### Failure 4 — `--gl=swiftshader` rejected
```
ERROR:ui/gl/init/gl_factory.cc: Requested GL implementation (gl=none,angle=none)
not found in allowed implementations: [(gl=egl-angle,angle=default)]
```
**Cause:** Remotion's `--gl` value doesn't map to this Chrome build's allowed list.
Only `egl-angle` with `angle=default` is permitted.
**Tried:** `--gl=swiftshader`. ❌ failed.

### Failure 5 — raw Chrome GPU crash
```
ERROR:content/browser/gpu/gpu_process_host.cc: GPU process exited unexpectedly: exit_code=15
WARNING: GPU process has crashed 1 time(s)
```
**Cause:** running chrome-headless-shell directly with
`--use-gl=angle --use-angle=swiftshader` still crashes the GPU process in this container.
**Tried:** direct binary invocation to isolate Remotion. ❌ failed.

### Failure 6 — Mesa software GL (llvmpipe)
```
GPU state invalid after WaitForGetOffsetInRange.
Failed to send GetTerminationStatus message to zygote: Broken pipe (32)
exit=124 (timeout)
```
**Tried:** `LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe` plus
`--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`.
Mesa IS installed (`/usr/lib/x86_64-linux-gnu/dri/*`), sudo works, and the flags are
correct. ❌ failed identically.

**This is the decisive result.** Every software-GL path dies the same way. The GPU
process cannot initialise in this container regardless of backend, flags, or drivers.

### Root cause assessment
This Codespace container has **no working GPU process**. It is not a flag, driver, or
configuration problem — software rasterisation is also blocked. Remotion needs a live
GPU process to composite three.js frames, so **it cannot render here at all**.

### Failure 7 — Xvfb virtual display
```
exit=124 (timeout, no DOM output)
```
**Tried:** `xvfb-run -a --server-args="-screen 0 1280x720x24"` + SwiftShader flags,
after installing `libxi-dev libxext-dev libgl1-mesa-dev libglu1-mesa-dev xvfb`.
A virtual X display does not help; the GPU process still fails. ❌

### Failure 8 — Obscura + three.js
```json
{"ok":false}   // canvas.getContext('webgl') returns null
```
**Cause:** Obscura **deliberately disables WebGL** to prevent fingerprinting. From its
own docs: *"There is no GPU renderer among them: `canvas.getContext('webgl')` returns
`null`."* Obscura has a layout + paint layer but **no GPU renderer by design**.
three.js cannot run in it. ❌ **Impossible, not a config issue.**

### Failure 9 — headless-gl (CPU three.js)
`npm i gl` fails to compile without X11 headers; after
`sudo apt-get install libxi-dev libxext-dev libgl1-mesa-dev libglu1-mesa-dev` it builds
but is abandoned: even if it worked, CPU rasterisation at 1080x1920 is roughly
**10–40 s/frame**, i.e. **5–12 hours** for a 62 s short. Not a usable workflow on
2 cores. ⏭️ **Rejected on speed, not feasibility.**

---

## DECISION (2026-11-04)

**3D / Remotion / three.js is out of scope while the only machine is this Codespace.**

The user's laptop is broken (4-day repair) and they work over SSH from Termux on a
phone. There is no fallback render machine.

**Consequence:** all video work must render on CPU in this container, in minutes not
hours. That means **2D** — Takumi stills + ffmpeg motion, which is already proven and
renders a 4.5-minute episode in ~12 minutes.

`/workspaces/remotion-studio` is kept on disk but is not part of the workflow. The
`cartoon-3d-short` skill stays installed for when a capable machine exists again.

### Options not yet tried
1. `--disable-gpu --disable-software-rasterizer` — may let Chrome run with no GL at all,
   but **three.js needs WebGL**, so this would render blank frames.
2. `xvfb-run` + non-headless Chrome — sometimes bypasses headless GPU init.
3. `LIBGL_ALWAYS_SOFTWARE=1` with Mesa's llvmpipe (needs `libgl1-mesa-dri` installed).
4. **Render elsewhere**: the project is self-contained and portable. Copy
   `/workspaces/remotion-studio` to a machine with a GPU or a working software GL stack.
5. Docker with `--gpus` or a proper `chrome` image.

**Recommendation:** option 4. This Codespace is for authoring, not 3D rendering
(user confirmed: "its a codespace for context").

---

## 2026-11-04 — Kino bundled ffmpeg 404

**Status: worked around.**
Kino's postinstall downloads its own ffmpeg from a dead GitHub URL (404).
**Fix:** `npm install @glitchoff/kino --ignore-scripts`, then set
`FFMPEG_PATH="$(command -v ffmpeg)"`. See `kino-guide.md`.

---

## 2026-11-04 — Piper Hindi voice is flat

**Status: accepted limitation, not a bug.**
Piper `hi_IN-pratham-medium` is clear but expressionless. Benchmarked at **RTF 0.95**
on this 2-core box (7.7 s to make 8.1 s of audio) — it is *not* slow, just flat.
Kokoro's Hindi is rated grade C, no better. Natural Hindi models need a GPU.
**Options:** cloud TTS (cents/video), or accept Piper.

---

## 2026-11-04 — Takumi / ffmpeg / art pipeline issues (all FIXED)

| Problem | Cause | Fix |
|---|---|---|
| `ERR_UNKNOWN_FILE_EXTENSION .tsx` | Node can't run TSX | bundle with esbuild first |
| `React is not defined` | JSX classic runtime | `--jsx=automatic` |
| Font not found after bundling | bundle sits at `.temp/<slug>/`, 2 levels deep | walk up until `package.json` + `assets/fonts` exist |
| Two headlines overlapping | `xfade=fade` blends two text frames | use `xfade=fadeblack` |
| Audio clipped at 0.0 dB | `amix normalize=0` | add `alimiter=limit=0.89` |
| Re-fetch wiped good art | download failed and overwrote | skip existing files unless `FORCE_REFETCH=1` |
| Art invisible behind text | scrims hardcoded per template | templates now honour per-scene `scrim` |
| Doodles drawn on black panel | `split` puts art on the right half | coordinates must account for the layout |
| `jq` parse error on credits | `cut -c` split a multibyte char | `tr -s ' \n' ' '` then `cut`, and `set -uo pipefail` |
| Openverse duration filter matched nothing | duration is in **milliseconds**, not seconds | divide by 1000 |
| Double render corrupting output | two `longform.sh` launched at once | `pipeline.sh` runs one step; resume skips cached clips |
| Headline orphan ("in" on its own line) | `split` template text column too narrow | width 900, size 68 |
| `i: command not found` then `syntax error near unexpected token fi` | `set -a; source envfile` exports every variable, including loop counters | parse the env file with `while IFS='=' read` and export only those keys |
| `stock-fetch.sh` found nothing, JSON decode error | `python3 - <<'PY'` heredoc occupies stdin, so the piped curl output was discarded | pass the JSON as an argv argument (`python3 -c '...' "$body"`) |
| Accent word lost its spaces ("can't feel it" → "can'tfeelit") | `split(accent)` with an empty prefix/suffix and flex row collapsed whitespace | use `indexOf` + `slice`, keeping the surrounding spaces |

---

## Conventions learned

- **Never run two of the same pipeline script at once** — they write to the same files.
- **Use `scripts/pipeline.sh <step> --scene N`** for iteration; a single still is ~1 s.
- **Check `pgrep` before blaming a script** — `pgrep -f pattern` matches its own command
  line, so counts can be off by one.
- **Background commands whose output is piped through `tail` show nothing until they
  finish** — read the file at `/home/codespace/.local/share/opencode/shell/*/*.out`.
